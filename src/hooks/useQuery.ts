import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
} from '@tanstack/react-query';

export const useSupabaseQuery = <TQueryFnData, TError = Error>(
  queryKey: QueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TQueryFnData, QueryKey>, 'queryKey' | 'queryFn'>,
) =>
  useQuery<TQueryFnData, TError>({
    queryKey,
    queryFn,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    ...options,
  });

export const useSupabaseMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) => useMutation(options);

export { useQueryClient };
