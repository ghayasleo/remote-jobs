"use client";

import { MouseEventHandler, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Backdrop, CircularProgress } from "@mui/material";
import Container from "./container";
import Filter from "./filter";
import useStore from "../store";
import linkIcon from "../assets/link.svg";
import { columns, detailsCol, tableWidth } from "../lib/table-col";
import { label, regionLabels } from "../lib/labels";
import type { Company } from "../lib/companies";

const paginationModel = { page: 0, pageSize: 10 };

// Keywords added as tags plus whatever is still typed in the box.
const keywordsFrom = (added: string, typed: string) =>
  [...added.split(","), typed].map((word) => word.trim().toLowerCase()).filter(Boolean);

const matchesAny = (text: string, keywords: string[]) =>
  keywords.length === 0 || keywords.some((keyword) => text.includes(keyword));

export default function CompaniesTable({ companies }: { companies: Company[] }) {
  const router = useRouter();
  const [fullscreenLoader, setFullscreenLoader] = useState(false);
  const { value } = useStore();

  const filteredCompanies = useMemo(() => {
    const name = value.name.trim().toLowerCase();
    const regions = keywordsFrom(value.added_regions, value.regions);
    const technologies = keywordsFrom(value.added_technologies, value.technologies);

    return companies.filter((company) => {
      const regionText = `${company.region} ${label(regionLabels, company.region)}`.toLowerCase();
      return (
        company.name.toLowerCase().includes(name) &&
        matchesAny(regionText, regions) &&
        matchesAny(company.searchTech, technologies)
      );
    });
  }, [companies, value]);

  const tableColumns = useMemo<GridColDef[]>(() => {
    const navigate: MouseEventHandler<HTMLAnchorElement> = (e) => {
      const isNewTab = e.metaKey || e.ctrlKey;
      if (!isNewTab) setFullscreenLoader(true);
    };

    return columns.map((column) =>
      column === detailsCol
        ? {
            ...column,
            renderCell: (params) => (
              <span className="h-full mx-auto grid place-content-center">
                <Image src={linkIcon} alt="Link Icon" width={15} height={15} />
                <Link
                  href={`/company-profiles/${params.row.slug}`}
                  className="absolute inset-0"
                  onClick={navigate}
                />
              </span>
            ),
          }
        : column,
    );
  }, []);

  return (
    <div>
      <Container>
        <Filter />

        <div className="overflow-x-auto">
          <DataGrid
            rows={filteredCompanies}
            columns={tableColumns}
            initialState={{ pagination: { paginationModel } }}
            disableRowSelectionOnClick
            disableColumnResize
            disableColumnMenu
            rowHeight={65}
            onRowClick={(params, e) => {
              if ((e.target as HTMLElement).tagName !== "A") {
                router.push(`/company-profiles/${params.row.slug}`);
              }
            }}
            sx={{
              border: 0,
              width: tableWidth,
              marginInline: "auto",
              ".MuiDataGrid-columnHeader,.MuiDataGrid-cell": {
                outline: "none !important",
              },
            }}
          />
        </div>
      </Container>

      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={fullscreenLoader}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
    </div>
  );
}
