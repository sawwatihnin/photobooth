import { create } from 'zustand';

export const useBoothStore = create(set => ({
  boothName: '',
  photos: [],

  setBoothName: name => set({ boothName: name }),
  setPhotos: photos => set({ photos }),

  reset: () => set({
    boothName: '',
    photos: []
  }),
}));

'use client';

import { create } from 'zustand';

export const useBoothStore = create(set => ({
  boothName: '',
  photos: [],

  setBoothName: name => set({ boothName: name }),
  setPhotos: photos => set({ photos }),

  reset: () => set({
    boothName: '',
    photos: []
  }),
}));
nano page.js
pwd

