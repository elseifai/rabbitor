import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unknown'

interface LocationCoordinates {
  lat: number
  lng: number
}

interface LocationStore {
  coordinates: LocationCoordinates | null
  formattedAddress: string | null
  isFetching: boolean
  permissionStatus: LocationPermissionStatus
  error: string | null
  setLocation: (lat: number, lng: number, address: string) => void
  setPermission: (status: LocationPermissionStatus) => void
  setFetching: (isFetching: boolean) => void
  setError: (error: string | null) => void
  clearLocation: () => void
}

const initialState = {
  coordinates: null,
  formattedAddress: null,
  isFetching: false,
  permissionStatus: 'unknown' as LocationPermissionStatus,
  error: null,
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => ({
      ...initialState,
      setLocation: (lat, lng, address) =>
        set({
          coordinates: { lat, lng },
          formattedAddress: address,
          isFetching: false,
          error: null,
          permissionStatus: 'granted',
        }),
      setPermission: (status) => set({ permissionStatus: status }),
      setFetching: (isFetching) => set({ isFetching }),
      setError: (error) => set({ error, isFetching: false }),
      clearLocation: () => set({ ...initialState, permissionStatus: 'unknown' }),
    }),
    {
      name: 'rabbit-location',
      version: 1,
      partialize: (state) => ({
        coordinates: state.coordinates,
        formattedAddress: state.formattedAddress,
        permissionStatus: state.permissionStatus,
      }),
      migrate: (persisted, version) => {
        if (version >= 1) {
          return persisted as {
            coordinates: LocationCoordinates | null
            formattedAddress: string | null
            permissionStatus: LocationPermissionStatus
          }
        }

        const legacy = persisted as {
          location?: {
            label?: string
            area?: string
            latitude?: number
            longitude?: number
          } | null
        }

        const loc = legacy?.location
        if (!loc?.latitude || !loc?.longitude) {
          return { ...initialState }
        }

        return {
          coordinates: { lat: loc.latitude, lng: loc.longitude },
          formattedAddress: loc.area || loc.label || null,
          permissionStatus: 'granted' as LocationPermissionStatus,
        }
      },
    },
  ),
)
