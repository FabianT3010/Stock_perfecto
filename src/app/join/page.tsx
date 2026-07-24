import JoinForm from "./JoinForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  return <JoinForm initialCode={(rawCode ?? "").toUpperCase()} />;
}
