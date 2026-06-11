import { parseBrowseSearchParams } from "@/lib/browse-params";
import { getBrowsePostings, getPostingDetail } from "@/lib/queries/postings";
import { BrowseView } from "@/components/browse/browse-view";
import { requestNowMs } from "@/components/browse/request-now";

type BrowsePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const filters = parseBrowseSearchParams(await searchParams);

  const [result, detail] = await Promise.all([
    getBrowsePostings(filters),
    filters.selected !== null
      ? getPostingDetail(filters.selected)
      : Promise.resolve(null),
  ]);

  return (
    <BrowseView
      filters={filters}
      result={result}
      detail={detail}
      now={requestNowMs()}
    />
  );
}
