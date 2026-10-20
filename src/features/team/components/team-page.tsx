"use client"

import { useState } from "react"
import { Eye, Loader2, Lock, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Permission, Role, User } from "@/domain/entities"
import { PERMISSION_LABEL } from "@/domain/labels"
import { useCommand } from "@/hooks/use-command"
import { useLive } from "@/hooks/use-live"
import { usePersona } from "@/hooks/use-persona"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageSkeleton } from "@/components/dashboard/page-skeleton"
import { PermissionButton } from "@/components/dashboard/permission-button"
import { SectionCard } from "@/components/dashboard/section-card"
import { DemoNotice } from "@/components/shared/demo-notice"
import { Field } from "@/components/shared/field"
import { StatusBadge, type Tone } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { teamCommands, type InviteInput } from "@/services/team-service"
import { useUiStore } from "@/stores/ui-store"

const STATUS: Record<User["status"], { label: string; tone: Tone }> = {
  active: { label: "Aktif", tone: "success" },
  invited: { label: "Diundang", tone: "info" },
  inactive: { label: "Nonaktif", tone: "neutral" },
}

const PERMISSIONS = Object.keys(PERMISSION_LABEL) as Permission[]
const ROLE_ORDER: Role["key"][] = ["owner", "sales", "operations", "finance", "content"]

export function TeamPage() {
  const live = useLive()
  const { user: persona, denial } = usePersona()
  const setPersona = useUiStore((state) => state.setPersona)
  const [inviting, setInviting] = useState(false)
  const changeRole = useCommand(teamCommands.changeRole, { success: (u) => `Peran ${u.name} diperbarui` })
  const setStatus = useCommand(teamCommands.setStatus, {
    success: (u) => (u.status === "active" ? `${u.name} aktif` : `${u.name} dinonaktifkan`),
  })
  const setPermission = useCommand(teamCommands.setPermission, { success: "Izin peran diperbarui" })
  if (!live) return <PageSkeleton />

  const { db } = live
  const userId = persona?.id ?? ""
  const roles = Object.values(db.roles).sort((a, b) => ROLE_ORDER.indexOf(a.key) - ROLE_ORDER.indexOf(b.key))
  const members = Object.values(db.users).sort((a, b) => ROLE_ORDER.indexOf(db.roles[a.roleId]?.key) - ROLE_ORDER.indexOf(db.roles[b.roleId]?.key) || a.name.localeCompare(b.name))
  const blocked = denial("team.manage")
  const pending = changeRole.pending || setStatus.pending

  return (
    <div>
      <PageHeader
        title="Tim & Peran"
        description="Anggota tim fiktif dan izin setiap peran. Pakai “Lihat sebagai” untuk mencoba dashboard dari sudut pandang peran lain; tidak ada login sungguhan."
        actions={
          <PermissionButton permission="team.manage" onClick={() => setInviting(true)}>
            <UserPlus aria-hidden="true" /> Undang anggota
          </PermissionButton>
        }
      />

      <SectionCard title={`Anggota (${members.length})`} bodyClassName="p-0">
        <ul className="divide-y divide-line">
          {members.map((member) => {
            const role = db.roles[member.roleId]
            const isPersona = member.id === persona?.id
            return (
              <li key={member.id} className="grid gap-3 px-5 py-3.5 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-strong">
                    {member.name}
                    <StatusBadge tone={STATUS[member.status].tone}>{STATUS[member.status].label}</StatusBadge>
                    {isPersona && (
                      <StatusBadge tone="accent" dot={false}>
                        Persona aktif
                      </StatusBadge>
                    )}
                  </p>
                  <p className="truncate text-xs text-text-subtle">
                    {member.title} · {member.email}
                  </p>
                </div>
                <Select value={member.roleId} disabled={!!blocked || pending} onValueChange={(roleId) => changeRole.run(userId, member.id, roleId)}>
                  <SelectTrigger aria-label={`Peran ${member.name}`} className="w-full" size="sm">
                    <SelectValue>{role?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {member.status === "active" && !isPersona && (
                    <Button variant="ghost" size="sm" onClick={() => setPersona(member.id)}>
                      <Eye aria-hidden="true" /> Lihat sebagai
                    </Button>
                  )}
                  {member.status === "invited" && (
                    <PermissionButton permission="team.manage" variant="secondary" size="sm" disabled={pending} onClick={() => setStatus.run(userId, member.id, "active")}>
                      Tandai undangan diterima
                    </PermissionButton>
                  )}
                  {member.status === "active" && (
                    <PermissionButton
                      permission="team.manage"
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      disabledReason={isPersona ? "Persona yang sedang dipakai tidak dapat dinonaktifkan." : null}
                      onClick={() => setStatus.run(userId, member.id, "inactive")}
                    >
                      Nonaktifkan
                    </PermissionButton>
                  )}
                  {member.status === "inactive" && (
                    <PermissionButton permission="team.manage" variant="ghost" size="sm" disabled={pending} onClick={() => setStatus.run(userId, member.id, "active")}>
                      Aktifkan kembali
                    </PermissionButton>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </SectionCard>

      <SectionCard
        className="mt-6"
        title="Matriks izin"
        description="Izin dicek setiap kali aksi dijalankan, jadi perubahan langsung berlaku. Peran Owner selalu memiliki semua izin."
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-table">
            <caption className="sr-only">Izin per peran</caption>
            <thead className="bg-canvas/70">
              <tr className="border-b border-line text-xs text-text-muted">
                <th scope="col" className="px-5 py-2 text-left font-semibold">
                  Izin
                </th>
                {roles.map((role) => (
                  <th key={role.id} scope="col" className="px-3 py-2 text-center font-semibold">
                    <span className="inline-flex items-center gap-1">
                      {role.name}
                      {role.key === "owner" && <Lock className="size-3" aria-label="tidak dapat diubah" />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-2 text-left font-normal text-text-strong">
                    {PERMISSION_LABEL[permission][0].toUpperCase() + PERMISSION_LABEL[permission].slice(1)}
                  </th>
                  {roles.map((role) => {
                    const granted = role.permissions.includes(permission)
                    const locked = role.key === "owner"
                    return (
                      <td key={role.id} className={cn("px-3 py-2 text-center", granted && "bg-tone-success-bg/40")}>
                        <Checkbox
                          checked={granted}
                          disabled={locked || !!blocked || setPermission.pending}
                          onCheckedChange={(checked) => setPermission.run(userId, role.id, permission, checked === true)}
                          aria-label={`${role.name}: ${PERMISSION_LABEL[permission]}`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {blocked && <p className="border-t border-line px-5 py-3 text-xs text-muted-foreground">{blocked}</p>}
      </SectionCard>

      <InviteDialog key={String(inviting)} open={inviting} onOpenChange={setInviting} roles={roles} userId={userId} />
    </div>
  )
}

function InviteDialog({ open, onOpenChange, roles, userId }: { open: boolean; onOpenChange: (open: boolean) => void; roles: Role[]; userId: string }) {
  const [value, setValue] = useState<InviteInput>({ name: "", email: "", title: "", roleId: roles.find((r) => r.key === "sales")?.id ?? roles[0]?.id ?? "" })
  const [errors, setErrors] = useState<Partial<Record<keyof InviteInput, string>>>({})
  const invite = useCommand(teamCommands.invite, { success: (u) => `${u.name} diundang (simulasi, tanpa email)`, onSuccess: () => onOpenChange(false) })
  const set = (patch: Partial<InviteInput>) => setValue((v) => ({ ...v, ...patch }))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form
          className="grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault()
            const result = await invite.run(userId, value)
            if (!result.ok && result.error.field) setErrors({ [result.error.field]: result.error.message })
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Undang anggota</DialogTitle>
            <DialogDescription>Anggota baru berstatus Diundang sampai undangan diterima.</DialogDescription>
          </DialogHeader>
          <Field label="Nama" error={errors.name}>
            {(c) => <Input {...c} value={value.name} onChange={(e) => set({ name: e.target.value })} />}
          </Field>
          <Field label="Email" error={errors.email} description="Gunakan domain fiktif, mis. @nusavista.example">
            {(c) => <Input {...c} type="email" value={value.email} onChange={(e) => set({ email: e.target.value })} />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jabatan" optional>
              {(c) => <Input {...c} value={value.title} onChange={(e) => set({ title: e.target.value })} />}
            </Field>
            <Field label="Peran">
              {(c) => (
                <Select value={value.roleId} onValueChange={(roleId) => set({ roleId })}>
                  <SelectTrigger {...c} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </div>
          <DemoNotice>Simulasi: tidak ada email undangan yang dikirim.</DemoNotice>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={invite.pending}>
              Batal
            </Button>
            <Button type="submit" disabled={invite.pending}>
              {invite.pending && <Loader2 className="animate-spin" aria-hidden="true" />}
              Undang
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
