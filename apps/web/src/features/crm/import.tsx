"use client";
import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  PageHeading,
} from "@/components/ui/primitives";
import { post, api, errorMessage } from "@/lib/api";
import { PermissionNotice } from "@/features/settings/company";
import { kinds, labels, type CrmKind } from "./types";
type Preview = {
  rows: {
    line: number;
    data: Record<string, string> | null;
    errors: string[];
    duplicate: boolean;
  }[];
  total: number;
  invalid: number;
  duplicates: number;
};
export function downloadCsv(csv: string, filename: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ImportRecords() {
  const params = useSearchParams();
  const initial = params.get("kind") as CrmKind;
  const [kind, setKind] = useState<CrmKind>(
    kinds.includes(initial) ? initial : "leads",
  );
  const { data: session } = useSession();
  const cache = useQueryClient();
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [fileError, setFileError] = useState("");
  const [policy, setPolicy] = useState("skip");
  const [requestId, setRequestId] = useState("");
  const preview = useMutation({
    mutationFn: () =>
      post<Preview>("/crm/import", {
        kind,
        csv,
        mode: "preview",
        duplicatePolicy: policy,
      }),
  });
  const run = useMutation({
    mutationFn: () =>
      post<{ created: number; skipped: number; total: number }>("/crm/import", {
        kind,
        csv,
        mode: "import",
        duplicatePolicy: policy,
        requestId,
      }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["crm"] }),
  });
  const reset = () => {
    if (run.isPending) return;
    preview.reset();
    run.reset();
    setRequestId(crypto.randomUUID());
  };
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.create`))
    return <PermissionNotice />;
  return (
    <div className="page-stack commercial-tools-page">
      <PageHeading
        title="Importar cadastros"
        description="Revise sua planilha antes de criar registros. Dados existentes nunca são alterados."
      />
      <Link href={`/crm/${kind}`} className="text-link">
        Voltar a {labels[kind].plural.toLowerCase()}
      </Link>
      <Card>
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            preview.mutate();
          }}
        >
          <Field id="import-kind" label="Tipo de cadastro">
            <Select
              id="import-kind"
              value={kind}
              disabled={run.isPending || preview.isPending}
              onChange={(e) => {
                setKind(e.target.value as CrmKind);
                reset();
              }}
            >
              {kinds
                .filter((k) => session.permissions.includes(`${k}.create`))
                .map((k) => (
                  <option key={k} value={k}>
                    {labels[k].plural}
                  </option>
                ))}
            </Select>
          </Field>
          <Field id="import-file" label="Planilha CSV">
            <Input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              disabled={run.isPending || preview.isPending}
              onChange={async (e) => {
                reset();
                setCsv("");
                setFileError("");
                const file = e.target.files?.[0];
                if (!file) return;
                if (
                  file.size > 300000 ||
                  !file.name.toLowerCase().endsWith(".csv")
                ) {
                  setFileError(
                    "Use um arquivo CSV UTF-8 de até 300 KB. Exporte sua planilha para CSV.",
                  );
                  return;
                }
                setFilename(file.name);
                setCsv(await file.text());
              }}
            />
            <p className="field-hint">
              CSV UTF-8 de até 300 KB e 500 linhas. Colunas: nome, email,
              telefone e origem. Nome obrigatório; vírgula ou ponto e vírgula.
              Responsável será você.
            </p>
          </Field>
          <Button
            variant="ghost"
            onClick={() =>
              downloadCsv(
                "nome,email,telefone,origem\r\nLead fictício,lead@example.test,5511999990000,Evento",
                "modelo-cadastros.csv",
              )
            }
          >
            Baixar planilha de exemplo
          </Button>
          <Field
            id="import-policy"
            label="Possíveis duplicados por email ou telefone"
          >
            <Select
              id="import-policy"
              value={policy}
              disabled={run.isPending || preview.isPending}
              onChange={(e) => {
                setPolicy(e.target.value);
                reset();
              }}
            >
              <option value="skip">Ignorar duplicados</option>
              <option value="create">Criar mesmo assim, sem mesclar</option>
            </Select>
          </Field>
          {fileError && <Alert>{fileError}</Alert>}
          {preview.isError && <Alert>{errorMessage(preview.error)}</Alert>}
          <Button
            type="submit"
            disabled={!csv || run.isPending}
            loading={preview.isPending}
          >
            Validar e ver prévia
          </Button>
        </form>
      </Card>
      {preview.data && (
        <Card>
          <h2>Revise a importação</h2>
          <p>
            {filename} · {preview.data.total} linhas · {preview.data.invalid}{" "}
            inválidas · {preview.data.duplicates} possíveis duplicados
          </p>
          <p className="field-hint">
            Prévia das primeiras 20 linhas. A validação abrange o arquivo
            inteiro.
          </p>
          <div
            className="table-scroll"
            role="region"
            aria-label="Prévia da planilha"
            tabIndex={0}
          >
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {preview.data.rows.slice(0, 20).map((r) => (
                  <tr key={r.line}>
                    <td>{r.line}</td>
                    <td>{r.data?.name}</td>
                    <td>{r.data?.email}</td>
                    <td>
                      {r.errors.length
                        ? r.errors.join(" ")
                        : r.duplicate
                          ? "Possível duplicado"
                          : "Válida"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {run.isError && <Alert>{errorMessage(run.error)}</Alert>}
          {run.data ? (
            <Alert success>
              {run.data.created} cadastros criados; {run.data.skipped}{" "}
              duplicados ignorados.{" "}
              <Link href={`/crm/${kind}`}>Ver cadastros</Link>
            </Alert>
          ) : (
            <Button
              disabled={preview.data.invalid > 0 || preview.isPending}
              loading={run.isPending}
              onClick={() => run.mutate()}
            >
              Importar{" "}
              {preview.data.total -
                (policy === "skip" ? preview.data.duplicates : 0)}{" "}
              cadastros
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
export function ExportRecords({
  kind,
  query,
}: {
  kind: CrmKind;
  query: URLSearchParams;
}) {
  const exportData = useMutation({
    mutationFn: () =>
      api<{ csv: string; total: number }>(`/crm/export?kind=${kind}&${query}`),
    onSuccess: (data) => downloadCsv(data.csv, `desmos-${kind}.csv`),
  });
  return (
    <>
      <Button
        variant="ghost"
        loading={exportData.isPending}
        onClick={() => exportData.mutate()}
      >
        Exportar CSV
      </Button>
      {exportData.isError && (
        <span role="alert">{errorMessage(exportData.error)}</span>
      )}
    </>
  );
}
