import { create } from 'zustand';
import { useCaseFactory } from '../../infrastructure/factories/repository.factory';
import { useAuthStore } from './authStore';

interface NotificacionesState {
  noLeidas: number;
  cargarNoLeidas: () => Promise<void>;
}

export const useNotificacionesStore = create<NotificacionesState>((set) => ({
  noLeidas: 0,

  cargarNoLeidas: async () => {
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ noLeidas: 0 });
      return;
    }
    try {
      const todas = await useCaseFactory.notificaciones.getAll();
      set({ noLeidas: todas.filter((n) => n.usuario === user.id && !n.leida).length });
    } catch {
    }
  },
}));
