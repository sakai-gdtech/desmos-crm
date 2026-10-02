import { notFound } from "next/navigation";
import { FieldManager } from "@/features/crm/fields";
import { ImportRecords } from "@/features/crm/import";
import { IntakeForms } from "@/features/crm/intake";
import { CrmList } from "@/features/crm/list";
import { CrmForm } from "@/features/crm/form";
import { CrmDetail } from "@/features/crm/detail";
import { CrmTags } from "@/features/crm/tags";
import { CrmTrash } from "@/features/crm/trash";
import { kinds, type CrmKind } from "@/features/crm/types";
export default async function CrmPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  if (path.length === 1 && path[0] === "fields") return <FieldManager />;
  if (path.length === 1 && path[0] === "import") return <ImportRecords />;
  if (path.length === 1 && path[0] === "intake") return <IntakeForms />;
  if (path.length === 1 && path[0] === "tags") return <CrmTags />;
  if (path.length === 1 && path[0] === "trash") return <CrmTrash />;
  if (!kinds.includes(path[0] as CrmKind)) notFound();
  const kind = path[0] as CrmKind;
  if (path.length === 1) return <CrmList key={kind} kind={kind} />;
  if (path.length === 2 && path[1] === "new")
    return <CrmForm key={kind} kind={kind} />;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      path[1],
    )
  )
    notFound();
  if (path.length === 2)
    return <CrmDetail key={path.join("/")} kind={kind} id={path[1]} />;
  if (path.length === 3 && path[2] === "edit")
    return <CrmForm key={path.join("/")} kind={kind} id={path[1]} />;
  notFound();
}
