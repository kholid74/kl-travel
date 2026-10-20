import type { Traveler } from "../entities"

export const TRAVELER_REQUIRED_FIELDS = {
  fullName: "Nama lengkap",
  gender: "Jenis kelamin",
  dateOfBirth: "Tanggal lahir",
  emergencyContact: "Kontak darurat",
} as const

export function missingTravelerFields(traveler: Traveler): string[] {
  const missing: string[] = []
  if (!traveler.fullName?.trim()) missing.push(TRAVELER_REQUIRED_FIELDS.fullName)
  if (!traveler.gender) missing.push(TRAVELER_REQUIRED_FIELDS.gender)
  if (!traveler.dateOfBirth) missing.push(TRAVELER_REQUIRED_FIELDS.dateOfBirth)
  if (!traveler.emergencyContact?.name || !traveler.emergencyContact?.phone) {
    missing.push(TRAVELER_REQUIRED_FIELDS.emergencyContact)
  }
  return missing
}

export function isTravelerComplete(traveler: Traveler): boolean {
  return missingTravelerFields(traveler).length === 0
}
