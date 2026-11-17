import { Chip } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { companySizeLabels, label, regionLabels, remotePolicyLabels } from "./labels";

export const detailsCol: GridColDef = {
  field: "details",
  headerName: "Details",
  sortable: false,
  width: 100,
};

export const columns: Array<GridColDef> = [
  {
    field: "id",
    headerName: "ID",
    width: 50,
    sortable: false,
  },
  {
    field: "name",
    headerName: "Company",
    width: 230,
  },
  {
    field: "website",
    headerName: "Website",
    sortable: false,
    width: 235,
    renderCell: (params) => (
      <a
        href={params.row.website}
        target="_blank"
        rel="noopener noreferrer"
        className="text-theme hover:underline h-full w-full block relative z-10"
      >
        {params.row.website}
      </a>
    ),
  },
  {
    field: "region",
    headerName: "Region",
    width: 170,
    valueGetter: (value: string) => label(regionLabels, value),
    renderCell: (params) => (
      <div className="flex items-center h-full">
        <Chip
          size="small"
          label={params.value}
          sx={{ fontSize: 12, paddingInline: 0.5, fontWeight: 500 }}
        />
      </div>
    ),
  },
  {
    field: "remotePolicy",
    headerName: "Remote policy",
    width: 150,
    valueGetter: (value: string) => label(remotePolicyLabels, value),
  },
  {
    field: "companySize",
    headerName: "Size",
    width: 165,
    valueGetter: (value: string | null) => label(companySizeLabels, value),
  },
  detailsCol,
];

export const tableWidth = columns.reduce((sum, item) => sum + (item.width || 0), 0);
