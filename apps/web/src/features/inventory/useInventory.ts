import type { MovementInput, RecipeInput, SupplierInput, SupplyInput } from '@bigger/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryService } from '../../services/inventory.service';

const ROOT = ['admin', 'inventory'] as const;

export const useSupplies = () =>
  useQuery({
    queryKey: [...ROOT, 'supplies'],
    queryFn: ({ signal }) => inventoryService.supplies(signal),
  });
export const useSuppliers = () =>
  useQuery({
    queryKey: [...ROOT, 'suppliers'],
    queryFn: ({ signal }) => inventoryService.suppliers(signal),
  });
export const usePurchaseList = () =>
  useQuery({
    queryKey: [...ROOT, 'purchases'],
    queryFn: ({ signal }) => inventoryService.purchaseList(signal),
  });
export const useRecipes = () =>
  useQuery({
    queryKey: [...ROOT, 'recipes'],
    queryFn: ({ signal }) => inventoryService.recipes(signal),
  });

/** Any change refreshes stock, alerts and the purchase list together: they all derive from it. */
function useInventoryMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROOT }),
  });
}

export const useSaveSupply = () =>
  useInventoryMutation(({ id, input }: { id: string | null; input: SupplyInput }) =>
    id ? inventoryService.updateSupply(id, input) : inventoryService.createSupply(input),
  );
export const useArchiveSupply = () => useInventoryMutation(inventoryService.archiveSupply);
export const useRegisterMovement = () =>
  useInventoryMutation(({ id, input }: { id: string; input: MovementInput }) =>
    inventoryService.registerMovement(id, input),
  );
export const useSaveSupplier = () =>
  useInventoryMutation(({ id, input }: { id: string | null; input: SupplierInput }) =>
    id ? inventoryService.updateSupplier(id, input) : inventoryService.createSupplier(input),
  );
export const useArchiveSupplier = () => useInventoryMutation(inventoryService.archiveSupplier);
export const useSetRecipe = () =>
  useInventoryMutation(({ productId, input }: { productId: string; input: RecipeInput }) =>
    inventoryService.setRecipe(productId, input),
  );
