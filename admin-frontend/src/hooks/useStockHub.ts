import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL, API_ENDPOINTS } from '../api/config';
import { tokenStorage } from '../utils/token';
import type { StockItemResponse } from '../types/supplier.types';
import type { MedicineResponse } from '../types/medicine.types';

// Payload shapes matching StockNotifier.cs SendAsync calls
interface StockUpdatedPayload {
  medicineId: string;
  medicineName: string;
  medicineForm: string;
  medicineStrength: string | null;
  quantityOnHand: number;
  costPrice: number;
  sellingPrice: number;
  lastSupplierName: string | null;
}

interface MedicinePublishedPayload {
  medicineId: string;
  stockQuantity: number;
}

export function useStockHub() {
  const qc = useQueryClient();
  const qcRef = useRef(qc);
  qcRef.current = qc;

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE_URL}${API_ENDPOINTS.signalR.stock}`, {
        accessTokenFactory: () => tokenStorage.getToken() ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // ── StockUpdated ─────────────────────────────────────────────────────────
    // Fired after a purchase order completes. Upserts the row in the hospital
    // stock cache so the table updates immediately without a refetch.
    // Only unpublished medicines live in the stock list — published ones are
    // excluded by the backend query and must never appear here.
    connection.on('StockUpdated', (payload: StockUpdatedPayload) => {
      // Update hospital stock cache
      qcRef.current.setQueryData<StockItemResponse[]>(
        ['admin-hospital-stock'],
        old => {
          if (!old) return old;
          const exists = old.some(s => s.medicineId === payload.medicineId);
          const updated: StockItemResponse = {
            medicineId:       payload.medicineId,
            medicineName:     payload.medicineName,
            medicineForm:     payload.medicineForm,
            medicineStrength: payload.medicineStrength ?? undefined,
            quantityOnHand:   payload.quantityOnHand,
            costPrice:        payload.costPrice,
            sellingPrice:     payload.sellingPrice,
            lastSupplierName: payload.lastSupplierName ?? undefined,
          };
          return exists
            ? old.map(s => s.medicineId === payload.medicineId ? updated : s)
            : [...old, updated];
        },
      );

      // Update stockQuantity on the matching medicine in the medicines-dashboard cache
      qcRef.current.setQueryData<MedicineResponse[]>(
        ['medicines-dashboard'],
        old => old
          ? old.map(m =>
              m.id === payload.medicineId
                ? { ...m, stockQuantity: payload.quantityOnHand }
                : m,
            )
          : old,
      );

      // Also update the paginated medicines query used by MedicinesPage
      qcRef.current.setQueriesData<{ items: MedicineResponse[]; total: number }>(
        { queryKey: ['admin-medicines'] },
        old => old
          ? {
              ...old,
              items: old.items.map(m =>
                m.id === payload.medicineId
                  ? { ...m, stockQuantity: payload.quantityOnHand }
                  : m,
              ),
            }
          : old,
      );
    });

    // ── MedicinePublished ─────────────────────────────────────────────────────
    // Fired after Publish to Medicines. Removes the row from the stock cache
    // and flips isAvailableInHospital + stockQuantity on the medicine.
    connection.on('MedicinePublished', (payload: MedicinePublishedPayload) => {
      // Remove from hospital stock list — row disappears instantly
      qcRef.current.setQueryData<StockItemResponse[]>(
        ['admin-hospital-stock'],
        old => old
          ? old.filter(s => s.medicineId !== payload.medicineId)
          : old,
      );

      // Flip isAvailableInHospital + set stockQuantity on medicines-dashboard cache
      qcRef.current.setQueryData<MedicineResponse[]>(
        ['medicines-dashboard'],
        old => old
          ? old.map(m =>
              m.id === payload.medicineId
                ? { ...m, isAvailableInHospital: true, stockQuantity: payload.stockQuantity }
                : m,
            )
          : old,
      );

      // Same update for the paginated MedicinesPage cache
      qcRef.current.setQueriesData<{ items: MedicineResponse[]; total: number }>(
        { queryKey: ['admin-medicines'] },
        old => old
          ? {
              ...old,
              items: old.items.map(m =>
                m.id === payload.medicineId
                  ? { ...m, isAvailableInHospital: true, stockQuantity: payload.stockQuantity }
                  : m,
              ),
            }
          : old,
      );

      // Refresh the catalogue total count shown in the Medicines page header
      qcRef.current.invalidateQueries({ queryKey: ['medicines-total-count'] });
    });

    connection.start().catch(() => { /* SignalR is an enhancement — fail silently */ });

    return () => {
      connection.stop();
    };
  }, []); // qc accessed via stable ref — no deps needed
}
