const LS = {
  riderPhone: 'go_live_rider_phone',
  riderPassword: 'go_live_rider_password',
  driverPhone: 'go_live_driver_phone',
  driverPassword: 'go_live_driver_password',
  vehicleCategoryId: 'go_live_vehicle_category_id',
  manualRideId: 'go_live_manual_ride_id',
  includeWrites: 'go_live_include_writes',
}

export function loadTesterSettings() {
  try {
    return {
      riderPhone: localStorage.getItem(LS.riderPhone) || '01234567890',
      riderPassword: localStorage.getItem(LS.riderPassword) || 'Test1234',
      driverPhone: localStorage.getItem(LS.driverPhone) || '',
      driverPassword: localStorage.getItem(LS.driverPassword) || '',
      vehicleCategoryId: localStorage.getItem(LS.vehicleCategoryId) || '',
      manualRideId: localStorage.getItem(LS.manualRideId) || '',
      includeWrites: localStorage.getItem(LS.includeWrites) === '1',
    }
  } catch {
    return {
      riderPhone: '01234567890',
      riderPassword: 'Test1234',
      driverPhone: '',
      driverPassword: '',
      vehicleCategoryId: '',
      manualRideId: '',
      includeWrites: false,
    }
  }
}

export function saveTesterSettings(form) {
  localStorage.setItem(LS.riderPhone, form.riderPhone)
  localStorage.setItem(LS.riderPassword, form.riderPassword)
  localStorage.setItem(LS.driverPhone, form.driverPhone)
  localStorage.setItem(LS.driverPassword, form.driverPassword)
  localStorage.setItem(LS.vehicleCategoryId, form.vehicleCategoryId)
  localStorage.setItem(LS.manualRideId, form.manualRideId)
  localStorage.setItem(LS.includeWrites, form.includeWrites ? '1' : '0')
}
