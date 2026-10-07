import {
  createGroupRequestDto,
  type GroupSummaryResponseDto,
  type InviteMemberRequestDto,
  inviteMemberRequestDto,
  type MemberResponseDto,
  type TenantRoleSchema,
  tenantRoleSchema,
} from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { listTenantsApi } from '@/knowledge/apis/knowledge.api';
import {
  addGroupMemberApi,
  addMemberApi,
  changeMemberRoleApi,
  createGroupApi,
  deleteGroupApi,
  listGroupMembersApi,
  listGroupsApi,
  listMembersApi,
  removeGroupMemberApi,
  removeMemberApi,
} from '@/security/apis/security.api';
import { useAuth } from '~/auth/auth-context';
import { login } from '~/auth/oidc';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { Field, inputControlClassName } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { ListSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function SecurityPage() {
  useSignals();
  const { user, actorKey } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedTenantId = useSignal('');
  const selectedGroup = useSignal('');
  const selectedUser = useSignal('');
  const memberToRemove = useSignal<MemberResponseDto | null>(null);
  const groupToRemove = useSignal<GroupSummaryResponseDto | null>(null);
  const actionError = useSignal('');

  const tenants = useQuery({
    queryKey: ['tenants', actorKey],
    queryFn: () => listTenantsApi(),
  });
  const currentTenantId = selectedTenantId.value || tenants.data?.[0]?.id || '';

  const members = useQuery({
    queryKey: ['members', actorKey, currentTenantId],
    queryFn: () => listMembersApi(currentTenantId),
    enabled: !!currentTenantId,
  });

  const groups = useQuery({
    queryKey: ['groups', actorKey, currentTenantId],
    queryFn: () => listGroupsApi(currentTenantId),
    enabled: !!currentTenantId,
  });

  const activeGroupId = selectedGroup.value || groups.data?.[0]?.id || '';

  const groupMembers = useQuery({
    queryKey: ['group-members', actorKey, activeGroupId],
    queryFn: () => listGroupMembersApi(activeGroupId),
    enabled: !!activeGroupId,
  });

  const invitationForm = useForm<z.input<typeof inviteMemberRequestDto>, unknown, InviteMemberRequestDto>({
    resolver: zodResolver(inviteMemberRequestDto),
    defaultValues: { email: '', role: 'viewer' },
  });
  const groupFormSchema = createGroupRequestDto.pick({ name: true });
  type GroupFormValues = z.infer<typeof groupFormSchema>;

  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: '' },
  });

  const addMember = useMutation({
    mutationFn: (invitationPayload: InviteMemberRequestDto) =>
      addMemberApi(currentTenantId, invitationPayload),
    onSuccess: async () => {
      invitationForm.reset();
      actionError.value = '';
      toast({
        variant: 'success',
        title: 'Miembro añadido',
        description: 'El usuario ya dispone de acceso bajo las políticas RLS del rol asignado.',
      });
      await queryClient.invalidateQueries({ queryKey: ['members', actorKey, currentTenantId] });
    },
  });

  const updateRole = useMutation({
    mutationFn: ({ userSub, role }: { userSub: string; role: TenantRoleSchema }) =>
      changeMemberRoleApi(currentTenantId, userSub, role),
    onSuccess: async () => {
      actionError.value = '';
      toast({
        variant: 'info',
        title: 'Rol actualizado',
      });
      await queryClient.invalidateQueries({ queryKey: ['members', actorKey, currentTenantId] });
    },
    onError: (err) => {
      actionError.value = err instanceof Error ? err.message : 'No se pudo cambiar el rol.';
    },
  });

  const removeMember = useMutation({
    mutationFn: (userSub: string) => removeMemberApi(currentTenantId, userSub),
    onSuccess: async () => {
      memberToRemove.value = null;
      actionError.value = '';
      toast({
        variant: 'warning',
        title: 'Membresía revocada',
      });
      await queryClient.invalidateQueries({ queryKey: ['members', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['groups', actorKey, currentTenantId] });
    },
    onError: (err) => {
      memberToRemove.value = null;
      actionError.value = err instanceof Error ? err.message : 'No se pudo remover al miembro.';
    },
  });

  const createGroup = useMutation({
    mutationFn: (groupPayload: GroupFormValues) =>
      createGroupApi(currentTenantId, { ...groupPayload, tenant_id: currentTenantId }),
    onSuccess: async (created) => {
      groupForm.reset();
      selectedGroup.value = created.id;
      toast({
        variant: 'success',
        title: 'Grupo de acceso creado',
      });
      await queryClient.invalidateQueries({ queryKey: ['groups', actorKey, currentTenantId] });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) => deleteGroupApi(groupId),
    onSuccess: async () => {
      groupToRemove.value = null;
      selectedGroup.value = '';
      toast({
        variant: 'warning',
        title: 'Grupo eliminado',
      });
      await queryClient.invalidateQueries({ queryKey: ['groups', actorKey, currentTenantId] });
    },
    onError: (err) => {
      groupToRemove.value = null;
      actionError.value = err instanceof Error ? err.message : 'No se pudo eliminar el grupo.';
    },
  });

  const addToGroup = useMutation({
    mutationFn: () => addGroupMemberApi(activeGroupId, selectedUser.value),
    onSuccess: async () => {
      selectedUser.value = '';
      toast({
        variant: 'success',
        title: 'Integrante asignado al grupo',
      });
      await queryClient.invalidateQueries({ queryKey: ['groups', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['group-members', actorKey, activeGroupId] });
    },
  });

  const removeFromGroup = useMutation({
    mutationFn: (userSub: string) => removeGroupMemberApi(activeGroupId, userSub),
    onSuccess: async () => {
      toast({
        variant: 'info',
        title: 'Integrante removido del grupo',
      });
      await queryClient.invalidateQueries({ queryKey: ['groups', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['group-members', actorKey, activeGroupId] });
    },
  });

  const callerMembership = members.data?.find((memberItem) => memberItem.user_sub === user?.profile.sub);
  const canManageRoles = callerMembership?.role === 'owner';
  const canManageMembers = callerMembership?.role === 'owner' || callerMembership?.role === 'admin';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance / Identity"
        title="Miembros y grupos"
        description="Permisos por organización y revocación inmediata sobre grants documentales y grupos. Todas las reglas se aplican en PostgreSQL RLS."
      />
      {actionError.value && <ErrorState message={actionError.value} />}

      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label
              htmlFor="security-tenant"
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Organización
            </label>
            <select
              className={inputControlClassName}
              id="security-tenant"
              value={currentTenantId}
              onChange={(e) => {
                selectedTenantId.value = e.target.value;
                selectedGroup.value = '';
              }}
            >
              {tenants.data?.map((tenantItem) => (
                <option key={tenantItem.id} value={tenantItem.id}>
                  {tenantItem.name}
                </option>
              ))}
            </select>
          </div>
          <Button variant="secondary" onClick={() => void login()}>
            Portal de identidad
          </Button>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Miembros del tenant</h2>
          {members.isLoading ? (
            <ListSkeleton rows={3} label="Cargando miembros…" />
          ) : members.isError ? (
            <ErrorState message="No se pudieron consultar los miembros." />
          ) : members.data?.length ? (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {members.data.map((memberItem) => (
                <li
                  key={memberItem.user_sub}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {memberItem.email ?? memberItem.user_sub}
                  </span>
                  <div className="flex items-center gap-2">
                    {canManageRoles ? (
                      <select
                        aria-label={`Rol de ${memberItem.email ?? memberItem.user_sub}`}
                        value={memberItem.role}
                        disabled={updateRole.isPending}
                        onChange={(e) => {
                          const parsed = tenantRoleSchema.safeParse(e.target.value);
                          if (parsed.success) {
                            updateRole.mutate({
                              userSub: memberItem.user_sub,
                              role: parsed.data,
                            });
                          }
                        }}
                        className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        <option value="viewer">viewer</option>
                        <option value="admin">admin</option>
                        <option value="owner">owner</option>
                      </select>
                    ) : (
                      <span className="rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 font-mono text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                        {memberItem.role}
                      </span>
                    )}
                    {canManageMembers && memberItem.user_sub !== user?.profile.sub && (
                      <Button
                        variant="ghost"
                        aria-label={`Remover miembro ${memberItem.email ?? memberItem.user_sub}`}
                        className="min-h-8 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                        onClick={() => {
                          memberToRemove.value = memberItem;
                        }}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin miembros"
                description="Los miembros deben autenticarse antes de ser añadidos."
              />
            </div>
          )}

          <form
            className="mt-5 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            onSubmit={invitationForm.handleSubmit((invitationPayload) => addMember.mutate(invitationPayload))}
          >
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Agregar usuario existente
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              El usuario debe haber iniciado sesión al menos una vez en Keycloak.
            </p>
            <Field
              id="member-email"
              label="Correo del usuario"
              {...invitationForm.register('email')}
              error={invitationForm.formState.errors.email?.message}
            />
            <div>
              <label
                htmlFor="member-role"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Rol inicial
              </label>
              <select id="member-role" className={inputControlClassName} {...invitationForm.register('role')}>
                <option value="viewer">Lector (viewer)</option>
                <option value="admin">Administrador (admin)</option>
              </select>
            </div>
            <Button type="submit" disabled={!currentTenantId || addMember.isPending}>
              Agregar miembro
            </Button>
            {addMember.isError && (
              <ErrorState
                message={
                  addMember.error instanceof Error
                    ? addMember.error.message
                    : 'Operación no autorizada o el usuario no existe en la plataforma.'
                }
              />
            )}
          </form>
        </Panel>

        <Panel>
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Grupos de acceso</h2>
          {groups.isLoading ? (
            <ListSkeleton rows={2} label="Cargando grupos…" />
          ) : groups.isError ? (
            <ErrorState />
          ) : groups.data?.length ? (
            <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {groups.data.map((groupItem) => (
                <li
                  key={groupItem.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => {
                      selectedGroup.value = groupItem.id;
                    }}
                    className={`text-left font-medium transition-colors ${
                      activeGroupId === groupItem.id
                        ? 'text-sky-700 underline dark:text-sky-400'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {groupItem.name}{' '}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      ({groupItem.member_count} miembros)
                    </span>
                  </button>
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      aria-label={`Eliminar grupo ${groupItem.name}`}
                      className="min-h-8 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                      onClick={() => {
                        groupToRemove.value = groupItem;
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                title="Sin grupos"
                description="Crea un grupo para compartir documentos privados con varios usuarios."
              />
            </div>
          )}

          {activeGroupId && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Integrantes del grupo seleccionado
              </h3>
              {groupMembers.isLoading ? (
                <ListSkeleton rows={2} label="Cargando integrantes…" />
              ) : groupMembers.data?.length ? (
                <ul className="mt-2 divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                  {groupMembers.data.map((groupMemberItem) => (
                    <li key={groupMemberItem.user_sub} className="flex items-center justify-between py-2">
                      <span className="truncate text-zinc-900 dark:text-zinc-100">
                        {groupMemberItem.email ?? groupMemberItem.user_sub}
                      </span>
                      {canManageMembers && (
                        <Button
                          variant="ghost"
                          aria-label={`Quitar del grupo a ${groupMemberItem.email ?? groupMemberItem.user_sub}`}
                          className="min-h-8 px-2 py-1 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                          disabled={removeFromGroup.isPending}
                          onClick={() => removeFromGroup.mutate(groupMemberItem.user_sub)}
                        >
                          Quitar
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Este grupo aún no tiene integrantes.
                </p>
              )}
            </div>
          )}

          <form
            className="mt-5 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            onSubmit={groupForm.handleSubmit((groupPayload) => createGroup.mutate(groupPayload))}
          >
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">Crear grupo</h3>
            <Field
              id="group-name"
              label="Nombre"
              {...groupForm.register('name')}
              error={groupForm.formState.errors.name?.message}
            />
            <Button type="submit" disabled={!currentTenantId || createGroup.isPending}>
              Crear grupo
            </Button>
            {createGroup.isError && <ErrorState />}
          </form>

          <form
            className="mt-6 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
            onSubmit={(e) => {
              e.preventDefault();
              addToGroup.mutate();
            }}
          >
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Asignar miembro a grupo
            </h3>
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                htmlFor="group-select"
              >
                Grupo
              </label>
              <select
                id="group-select"
                className={inputControlClassName}
                value={activeGroupId}
                onChange={(e) => {
                  selectedGroup.value = e.target.value;
                }}
              >
                <option value="">Selecciona grupo</option>
                {groups.data?.map((groupItem) => (
                  <option value={groupItem.id} key={groupItem.id}>
                    {groupItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="group-user"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Miembro
              </label>
              <select
                id="group-user"
                className={inputControlClassName}
                value={selectedUser.value}
                onChange={(e) => {
                  selectedUser.value = e.target.value;
                }}
              >
                <option value="">Selecciona usuario</option>
                {members.data?.map((memberItem) => (
                  <option key={memberItem.user_sub} value={memberItem.user_sub}>
                    {memberItem.email ?? memberItem.user_sub}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={!activeGroupId || !selectedUser.value || addToGroup.isPending}>
              Añadir al grupo
            </Button>
            {addToGroup.isError && <ErrorState message="Ya pertenece al grupo o permisos insuficientes." />}
          </form>
        </Panel>
      </div>

      <ConfirmDialog
        open={!!memberToRemove.value}
        title="¿Remover miembro del tenant?"
        description={
          memberToRemove.value
            ? `Se revocará la membresía de «${memberToRemove.value.email ?? memberToRemove.value.user_sub}» junto con todos sus permisos documentales y pertenencia a grupos en esta organización.`
            : ''
        }
        confirmLabel="Remover miembro"
        busy={removeMember.isPending}
        onCancel={() => {
          memberToRemove.value = null;
        }}
        onConfirm={() => {
          if (memberToRemove.value) removeMember.mutate(memberToRemove.value.user_sub);
        }}
      />

      <ConfirmDialog
        open={!!groupToRemove.value}
        title="¿Eliminar grupo de acceso?"
        description={
          groupToRemove.value
            ? `Se eliminará el grupo «${groupToRemove.value.name}», revocando de inmediato el acceso por grupo a los documentos asociados.`
            : ''
        }
        confirmLabel="Eliminar grupo"
        busy={deleteGroup.isPending}
        onCancel={() => {
          groupToRemove.value = null;
        }}
        onConfirm={() => {
          if (groupToRemove.value) deleteGroup.mutate(groupToRemove.value.id);
        }}
      />
    </div>
  );
}
