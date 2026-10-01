"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingPage,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { api, errorMessage, patch, post } from "@/lib/api";
import { useSalesInvalidation } from "./shared";
import { money, type Deal } from "./types";
export type Product = {
  id: string;
  name: string;
  price: string;
  currency: string;
  version: number;
};
type Item = {
  productId?: string | null;
  name: string;
  quantity: number;
  unitPrice: string;
};
type Saved = {
  clientName: string;
  items: Item[];
  discount: string;
  total: string;
  currency: string;
  version: number;
};
function cents(v: string) {
  if (!/^\d{1,14}(\.\d{1,2})?$/.test(v))
    throw new Error("Informe preços com até duas casas decimais.");
  const [w, f = ""] = v.split(".");
  return BigInt(w) * 100n + BigInt(f.padEnd(2, "0"));
}
function amount(n: bigint) {
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function Proposal({
  id,
  embedded = false,
}: {
  id: string;
  embedded?: boolean;
}) {
  const { data: session } = useSession();
  const d = useQuery({
    queryKey: ["sales", "deals", id],
    queryFn: () => api<{ item: Deal }>(`/sales/deals/${id}`),
  });
  const p = useQuery({
    queryKey: ["sales", "proposal", id],
    queryFn: () => api<{ item: Saved | null }>(`/sales/deals/${id}/proposal`),
  });
  const catalog = useQuery({
    queryKey: ["sales", "products"],
    queryFn: () => api<{ items: Product[] }>("/sales/products"),
  });
  if (d.isPending || p.isPending) return <LoadingPage />;
  if (d.isError || p.isError || !d.data)
    return (
      <ErrorState
        error={d.error || p.error}
        retry={() => {
          d.refetch();
          p.refetch();
        }}
      />
    );
  const canEdit =
    !!session?.permissions.includes("deals.update") &&
    d.data.item.status === "OPEN" &&
    !d.data.item.deletedAt;
  return (
    <section className="proposal-panel">
      {!embedded && (
        <>
          <Link href={`/sales/deals/${id}`} className="back-link">
            <ArrowLeft size={15} />
            Voltar ao negócio
          </Link>
          <PageHeading
            title="Proposta comercial"
            description={d.data.item.title}
          />
        </>
      )}
      <ProposalEditor
        key={`${id}:${p.data?.item?.version ?? 0}:${d.data.item.status}`}
        deal={d.data.item}
        saved={p.data?.item ?? null}
        products={catalog.data?.items ?? []}
        canEdit={canEdit}
      />
      {catalog.isError && (
        <Alert>
          Catálogo indisponível. Os itens salvos continuam preservados.{" "}
          <Button variant="ghost" onClick={() => catalog.refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      )}
      {!embedded && session?.permissions.includes("pipelines.manage") && (
        <Catalog
          products={catalog.data?.items ?? []}
          currency={d.data.item.currency}
        />
      )}
    </section>
  );
}
function ProposalEditor({
  deal,
  saved,
  products,
  canEdit,
}: {
  deal: Deal;
  saved: Saved | null;
  products: Product[];
  canEdit: boolean;
}) {
  const invalidate = useSalesInvalidation();
  const [items, setItems] = useState<Item[]>(
    saved?.items ?? [
      { name: deal.title, quantity: 1, unitPrice: deal.value, productId: null },
    ],
  );
  const [discount, setDiscount] = useState(saved?.discount ?? "0.00");
  const [dirty, setDirty] = useState(!saved);
  const [success, setSuccess] = useState(false);
  const locked = useRef(false);
  let subtotal = "0.00",
    total = "0.00",
    calculationError = "";
  try {
    const sum = items.reduce((n, i) => {
      if (
        !Number.isSafeInteger(i.quantity) ||
        i.quantity < 1 ||
        i.quantity > 100000
      )
        throw new Error("Informe uma quantidade inteira de 1 a 100.000.");
      return n + BigInt(i.quantity) * cents(i.unitPrice);
    }, 0n);
    const off = cents(discount);
    if (off > sum) throw new Error("O desconto não pode superar o subtotal.");
    if (sum - off > 9999999999999999n)
      throw new Error("O total ultrapassa o limite permitido.");
    subtotal = amount(sum);
    total = amount(sum - off);
  } catch (e) {
    calculationError = (e as Error).message;
  }
  const save = useMutation({
    mutationFn: () =>
      api<{ item: Saved }>(`/sales/deals/${deal.id}/proposal`, {
        method: "PUT",
        body: JSON.stringify({ items, discount, version: saved?.version ?? 0 }),
      }),
    onSuccess: async () => {
      setDirty(false);
      setSuccess(true);
      await invalidate();
    },
    onSettled: () => {
      locked.current = false;
    },
  });
  function update(index: number, value: Partial<Item>) {
    setDirty(true);
    setSuccess(false);
    setItems((v) =>
      v.map((item, i) => (i === index ? { ...item, ...value } : item)),
    );
  }
  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (locked.current || calculationError) return;
        locked.current = true;
        save.mutate();
      }}
    >
      <div className="proposal-client">
        <span>Cliente</span>
        <strong>
          {saved?.clientName ||
            deal.companyName ||
            deal.contactName ||
            deal.leadName ||
            "Cliente não informado"}
        </strong>
        <p>Negócio: {deal.title}</p>
      </div>
      {saved && (
        <p className="field-hint">
          Proposta salva · versão {saved.version} · valor combinado{" "}
          {money(saved.total, saved.currency)}
        </p>
      )}
      {dirty && canEdit && (
        <p className="field-hint" role="status">
          Alterações ainda não salvas.
        </p>
      )}
      {success && (
        <Alert success>
          Proposta salva. Valor final atualizado no negócio.
        </Alert>
      )}
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <div className="proposal-items">
        {items.map((item, i) => (
          <fieldset
            className="proposal-item"
            key={i}
            disabled={!canEdit || save.isPending}
          >
            <legend>Item {i + 1}</legend>
            <Field id={`proposal-name-${i}`} label="Descrição">
              <Input
                id={`proposal-name-${i}`}
                required
                maxLength={200}
                value={item.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </Field>
            <div className="proposal-item-values">
              <Field id={`proposal-qty-${i}`} label="Quantidade">
                <Input
                  id={`proposal-qty-${i}`}
                  required
                  type="number"
                  min={1}
                  max={100000}
                  step={1}
                  value={item.quantity || ""}
                  onChange={(e) =>
                    update(i, { quantity: Number(e.target.value) })
                  }
                />
              </Field>
              <Field
                id={`proposal-price-${i}`}
                label={`Preço unitário (${deal.currency})`}
              >
                <Input
                  id={`proposal-price-${i}`}
                  required
                  inputMode="decimal"
                  pattern="[0-9]+([.][0-9]{1,2})?"
                  value={item.unitPrice}
                  onChange={(e) => update(i, { unitPrice: e.target.value })}
                />
              </Field>
              {canEdit && (
                <Button
                  variant="ghost"
                  disabled={items.length === 1}
                  aria-label={`Remover item ${i + 1}`}
                  onClick={() => {
                    setItems((v) => v.filter((_, index) => index !== i));
                    setDirty(true);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </fieldset>
        ))}
      </div>
      {canEdit && (
        <div className="proposal-add">
          <Button
            variant="secondary"
            disabled={items.length >= 30 || save.isPending}
            onClick={() => {
              setItems((v) => [
                ...v,
                { name: "", quantity: 1, unitPrice: "0.00", productId: null },
              ]);
              setDirty(true);
            }}
          >
            <Plus size={15} />
            Adicionar item
          </Button>
          <Field id="proposal-catalog" label="Adicionar do catálogo">
            <Select
              id="proposal-catalog"
              value=""
              disabled={items.length >= 30 || save.isPending}
              onChange={(e) => {
                const product = products.find((p) => p.id === e.target.value);
                if (product) {
                  setItems((v) => [
                    ...v,
                    {
                      name: product.name,
                      quantity: 1,
                      unitPrice: product.price,
                      productId: product.id,
                    },
                  ]);
                  setDirty(true);
                }
              }}
            >
              <option value="">Selecione um produto</option>
              {products
                .filter((p) => p.currency === deal.currency)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {money(p.price, p.currency)}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      )}
      <div className="proposal-totals">
        <p>
          <span>Subtotal</span>
          <strong>{money(subtotal, deal.currency)}</strong>
        </p>
        <Field id="proposal-discount" label={`Desconto (${deal.currency})`}>
          <Input
            id="proposal-discount"
            disabled={!canEdit || save.isPending}
            required
            inputMode="decimal"
            pattern="[0-9]+([.][0-9]{1,2})?"
            value={discount}
            onChange={(e) => {
              setDiscount(e.target.value);
              setDirty(true);
            }}
          />
        </Field>
        <p className="proposal-total">
          <span>Valor final</span>
          <strong>{money(total, deal.currency)}</strong>
        </p>
      </div>
      {calculationError && <Alert>{calculationError}</Alert>}
      <p className="field-hint">
        Os preços desta proposta ficam preservados ao alterar o catálogo. Salvar
        atualiza o valor final do negócio. Envio e assinatura serão adicionados
        depois.
      </p>
      {canEdit && (
        <div className="form-actions">
          {saved && dirty && (
            <Button
              variant="secondary"
              onClick={() => {
                setItems(saved.items);
                setDiscount(saved.discount);
                setDirty(false);
              }}
            >
              Descartar alterações
            </Button>
          )}
          <Button
            type="submit"
            loading={save.isPending}
            disabled={!dirty || !!calculationError}
          >
            Salvar proposta
          </Button>
        </div>
      )}
    </form>
  );
}
export function Catalog({
  products,
  currency,
}: {
  products: Product[];
  currency: string;
}) {
  return (
    <details className="more-details catalog-panel">
      <summary>Catálogo de produtos</summary>
      <p className="field-hint">
        Alterar um preço vale para novos itens. Propostas salvas mantêm o preço
        combinado.
      </p>
      {products.map((product) => (
        <ProductForm
          key={`${product.id}:${product.version}`}
          product={product}
          currency={currency}
        />
      ))}
      <ProductForm currency={currency} />
    </details>
  );
}
function ProductForm({
  product,
  currency,
}: {
  product?: Product;
  currency: string;
}) {
  const invalidate = useSalesInvalidation();
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price ?? "0.00");
  const save = useMutation({
    mutationFn: () =>
      product
        ? patch(`/sales/products/${product.id}`, {
            name,
            price,
            currency: product.currency,
            version: product.version,
          })
        : post("/sales/products", { name, price, currency }),
    onSuccess: async () => {
      if (!product) {
        setName("");
        setPrice("0.00");
      }
      await invalidate();
    },
  });
  return (
    <form
      className="catalog-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!save.isPending) save.mutate();
      }}
    >
      <Field
        id={`product-name-${product?.id ?? "new"}`}
        label={product ? "Produto" : "Novo produto"}
      >
        <Input
          id={`product-name-${product?.id ?? "new"}`}
          value={name}
          required
          maxLength={200}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field
        id={`product-price-${product?.id ?? "new"}`}
        label={`Preço (${product?.currency ?? currency})`}
      >
        <Input
          id={`product-price-${product?.id ?? "new"}`}
          inputMode="decimal"
          pattern="[0-9]+([.][0-9]{1,2})?"
          value={price}
          required
          onChange={(e) => setPrice(e.target.value)}
        />
      </Field>
      <Button variant="secondary" type="submit" loading={save.isPending}>
        {product ? "Atualizar preço" : "Criar produto"}
      </Button>
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      {save.isSuccess && <span role="status">Salvo.</span>}
    </form>
  );
}
