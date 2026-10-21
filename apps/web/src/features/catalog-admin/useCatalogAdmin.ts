import type { CategoryInput, ModifierGroupInput, ProductInput } from '@bigger/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../app/query-keys';
import { adminService } from '../../services/admin.service';

export function useAdminSession() {
  return useQuery({
    queryKey: queryKeys.adminSession,
    queryFn: ({ signal }) => adminService.getSession(signal),
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.login,
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.adminSession, session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminService.logout,
    onSuccess: (session) => {
      queryClient.removeQueries({ queryKey: queryKeys.admin });
      queryClient.setQueryData(queryKeys.adminSession, session);
    },
  });
}

export function useAdminCategories(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.adminCategories(includeArchived),
    queryFn: ({ signal }) => adminService.listCategories(includeArchived, signal),
  });
}

export function useAdminProducts(includeArchived = false) {
  return useQuery({
    queryKey: queryKeys.adminProducts(includeArchived),
    queryFn: ({ signal }) => adminService.listProducts(includeArchived, signal),
  });
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminProduct(id ?? 'nuevo'),
    queryFn: ({ signal }) => adminService.getProduct(id ?? '', signal),
    enabled: id !== undefined,
  });
}

export function useAdminModifierGroups() {
  return useQuery({
    queryKey: queryKeys.adminModifierGroups,
    queryFn: ({ signal }) => adminService.listModifierGroups(signal),
  });
}

export function useAdminModifierGroup(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminModifierGroup(id ?? 'nueva'),
    queryFn: ({ signal }) => adminService.getModifierGroup(id ?? '', signal),
    enabled: id !== undefined,
  });
}

/** Any catalog change refreshes the admin views, order taking and the public menu. */
function useCatalogMutation<TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin }),
        queryClient.invalidateQueries({ queryKey: queryKeys.catalog }),
      ]);
    },
  });
}

export const useSaveProduct = () =>
  useCatalogMutation(({ id, input }: { id: string | undefined; input: ProductInput }) =>
    id ? adminService.updateProduct(id, input) : adminService.createProduct(input),
  );
export const useArchiveProduct = () => useCatalogMutation(adminService.archiveProduct);
export const useRestoreProduct = () => useCatalogMutation(adminService.restoreProduct);

export const useSaveModifierGroup = () =>
  useCatalogMutation(({ id, input }: { id: string | undefined; input: ModifierGroupInput }) =>
    id ? adminService.updateModifierGroup(id, input) : adminService.createModifierGroup(input),
  );
export const useDeleteModifierGroup = () => useCatalogMutation(adminService.deleteModifierGroup);

export const useSaveCategory = () =>
  useCatalogMutation(({ id, input }: { id: string | undefined; input: CategoryInput }) =>
    id ? adminService.renameCategory(id, input) : adminService.createCategory(input),
  );
export const useArchiveCategory = () => useCatalogMutation(adminService.archiveCategory);
export const useRestoreCategory = () => useCatalogMutation(adminService.restoreCategory);
