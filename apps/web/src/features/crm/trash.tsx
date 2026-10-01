"use client";
import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RotateCcw, Search, Trash2 } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Input,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { api, errorMessage, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { Pagination, RecordLink, TableSkeleton, useDebounced } from "./shared";
import {
  fullName,
  kinds,
  labels,
  type CrmItem,
  type CrmKind,
  type CrmPage,
} from "./types";
export function CrmTrash() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const allowed = kinds.filter(
    (kind) =>
      session?.permissions.includes(`${kind}.delete`) ||
      session?.permissions.includes("crm.purge"),
  );
  const [kind, setKind] = useState<CrmKind>("leads");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [purging, setPurging] = useState<CrmItem | null>(null);
  const [success, setSuccess] = useState("");
  const activeKind = allowed.includes(kind) ? kind : allowed[0];
  const result = useQuery({
    queryKey: ["crm", activeKind, "trash", page, q],
    queryFn: () =>
      api<CrmPage>(
        `/crm/${activeKind}?deleted=true&page=${page}&pageSize=20&q=${encodeURIComponent(q)}`,
      ),
    enabled: !!activeKind,
    placeholderData: keepPreviousData,
  });
  const restore = useMutation({
    mutationFn: (item: CrmItem) =>
      post(`/crm/${activeKind}/${item.id}/restore`),
    onSuccess: async (_, item) => {
      setSuccess(`${fullName(item)} foi restaurado.`);
      setPage(1);
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });
  const purge = useMutation({
    mutationFn: (item: CrmItem) =>
      api(`/crm/${activeKind}/${item.id}/permanent`, { method: "DELETE" }),
    onSuccess: async () => {
      setSuccess("O registro foi excluído permanentemente.");
      setPage(1);
      setPurging(null);
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
    },
  });
  if (!session) return null;
  if (!allowed.length) return <PermissionNotice />;
  return (
    <div className="page-stack crm-page">
      <PageHeading
        title="Lixeira"
        description="Restaure registros excluídos ou remova-os permanentemente quando permitido."
      />
      {success && <Alert success>{success}</Alert>}
      {restore.isError && <Alert>{errorMessage(restore.error)}</Alert>}
      <Card className="table-card">
        <div className="crm-toolbar">
          <div className="search-field">
            <Search size={17} aria-hidden="true" />
            <Input
              aria-label="Buscar na lixeira"
              placeholder="Buscar registros excluídos"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            className="crm-trash-kind"
            aria-label="Tipo de registro"
            value={activeKind}
            onChange={(e) => {
              setKind(e.target.value as CrmKind);
              setPage(1);
              setSuccess("");
            }}
          >
            {allowed.map((value) => (
              <option key={value} value={value}>
                {labels[value].plural}
              </option>
            ))}
          </Select>
        </div>
        {result.isPending ? (
          <TableSkeleton />
        ) : result.isError ? (
          <ErrorState error={result.error} retry={() => result.refetch()} />
        ) : !result.data?.items.length ? (
          <EmptyState
            icon={<Trash2 size={28} />}
            title="Nenhum registro na lixeira"
            description={
              q
                ? "Não há registros excluídos com este termo. Tente outra busca."
                : `Os registros excluídos de ${labels[activeKind].plural.toLowerCase()} aparecerão aqui.`
            }
          />
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Registros excluídos"
          >
            <table>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Excluído em</th>
                  <th scope="col">Ações</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <RecordLink kind={activeKind} item={item} />
                    </td>
                    <td>
                      {formatDate(item.deletedAt, session.tenant.timezone)}
                    </td>
                    <td>
                      <div className="crm-row-actions">
                        {session.permissions.includes(
                          `${activeKind}.delete`,
                        ) && (
                          <Button
                            variant="secondary"
                            loading={
                              restore.isPending &&
                              restore.variables?.id === item.id
                            }
                            disabled={restore.isPending}
                            onClick={() => restore.mutate(item)}
                          >
                            <RotateCcw size={14} />
                            Restaurar
                          </Button>
                        )}
                        {session.permissions.includes("crm.purge") && (
                          <Button
                            variant="danger"
                            onClick={() => {
                              purge.reset();
                              setPurging(item);
                            }}
                          >
                            <Trash2 size={14} />
                            Excluir definitivamente
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result.data && (
          <Pagination
            page={page}
            total={result.data.total}
            onChange={setPage}
            loading={result.isFetching}
          />
        )}
      </Card>
      <Dialog
        open={!!purging}
        onClose={() => setPurging(null)}
        title="Excluir definitivamente?"
        description="O cadastro, suas notas e seu histórico serão apagados. Esta ação não pode ser desfeita."
      >
        <p className="crm-dialog-record">{purging && fullName(purging)}</p>
        <p className="crm-dialog-hint">
          Registros vinculados a outros cadastros precisam ter esses vínculos
          resolvidos antes da exclusão.
        </p>
        {purge.isError && <Alert>{errorMessage(purge.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setPurging(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={purge.isPending}
            onClick={() => purging && purge.mutate(purging)}
          >
            Excluir definitivamente
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
