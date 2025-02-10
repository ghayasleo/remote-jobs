"use client";

import Container from "./components/container";
import { jobsApi, getJobDetails } from "./lib/jobs-api";
import Filter from "./components/filter";
import axios from "axios";
import { useEffect, useState } from "react";
import CloseIcon from '@mui/icons-material/Close';
import linkIcon from "./assets/link.svg";
import Image from "next/image";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Chip, IconButton, Snackbar } from "@mui/material";
import Link from "next/link";
import useStore from "./store";
import { useRouter } from "next/navigation";

export type InputValues = {
  name: string;
  regions: string;
  technologies: string;
  added_regions: string;
  added_technologies: string;
}

export default function Home() {
  const router = useRouter();
  const [windowWidth, setWindowWidth] = useState(0);
  const [value, setValue] = useState<InputValues>({
    name: "",
    regions: "",
    technologies: "",
    added_regions: "",
    added_technologies: "",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const {jobs, setJobs} = useStore();

  useEffect(() => {
    setWindowWidth(window.innerWidth); // Access `window` inside useEffect

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      if (jobs.length === 0) {
        setJobs(await getJobs());
        setIsAlertOpen(false)
      }
      setIsLoaded(true);
    })();
  }, [jobs, setJobs]);

  useEffect(() => {
    const tomeout = setTimeout(() => {
      if (!isLoaded) {
        setIsAlertOpen(true)
      }
    }, 5000);

    return () => {
      clearTimeout(tomeout);
    };
  }, [isLoaded]);

  const filteredJobs = jobs.filter((job) => {
    const name = job.company.toLowerCase();
    const regions = job.regions.toLowerCase();
    const technologies = job.technologies.toLowerCase();

    const added_technologies = value.added_technologies.toLowerCase().split(",");
    const added_regions = value.added_regions.toLowerCase().split(",");
    const searched_technologies = value.technologies.toLowerCase();
    const searched_regions = value.regions.toLowerCase();
    const technologies_keywords = value.added_technologies ? [...added_technologies] : [];
    const regions_keywords = value.added_regions ? [...added_regions] : [];

    if (searched_regions) regions_keywords.push(searched_regions);
    if (searched_technologies) technologies_keywords.push(searched_technologies);

    const nameCheck = name.includes(value.name.toLowerCase());
    const technologiesCheck = technologies_keywords.length > 0 ? technologies_keywords.some(region => technologies.includes(region)) : true;
    const regionsCheck = regions_keywords.length > 0 ? regions_keywords.some(region => regions.includes(region)) : true;
    if (nameCheck && technologiesCheck && regionsCheck) {
      return job;
    }
  });

  const handleClose = () => setIsAlertOpen(false)

  const action = (
    <IconButton
      size="small"
      aria-label="close"
      color="inherit"
      onClick={handleClose}
    >
      <CloseIcon fontSize="small" />
      </IconButton>
  );

  return (
    <div>
      <Container>
        <Filter value={value} setValue={setValue} />

        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
          open={isAlertOpen}
          onClose={handleClose}
          message="Almost there! Gathering the newest remote job postings."
          key={"topright"}
          action={action}
          sx={{
            ".MuiSnackbarContent-message": {
              fontSize: windowWidth < 600 ? 10 : 14
            }
          }}
        />
        <div className="overflow-x-auto">
          <div className="min-w-[716px]">
            <DataGrid
              rows={filteredJobs}
              columns={columns}
              initialState={{ pagination: { paginationModel } }}
              disableRowSelectionOnClick
              disableColumnResize
              disableColumnMenu
              onRowClick={(params, e) => {
                if ((e.target as HTMLElement).tagName !== "A") {
                  router.push(params.row.details);
                }
              }}
              loading={!isLoaded}
              slotProps={{
                loadingOverlay: {
                  variant: 'linear-progress',
                  noRowsVariant: 'linear-progress',
                },
              }}
              sx={{
                border: 0,
                ".MuiDataGrid-columnHeader,.MuiDataGrid-cell": {
                  outline: "none !important",
                },
              }}
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", width: 50, sortable: false },
  { field: "company", headerName: "Company", flex: 1 },
  {
    field: "url",
    headerName: "Website",
    flex: 1,
    sortable: false,
    renderCell: (params) => (
      <a href={params.row.url} target="_blank" className="text-blue-600 hover:underline">
        {params.row.url}
      </a>
    ),
  },
  {
    field: "regions",
    headerName: "Regions",
    width: 350,
    sortable: false,
    renderCell: (params) => (
      <div className="flex flex-wrap gap-1 items-center h-full">
        {params.row.regions
          .split(",")
          .map((region: string) => region.trim())
          .map((region: string, idx: number) => (
            <Chip
              size="small"
              key={idx}
              label={region}
              sx={{ fontSize: 12, paddingInline: 0.5, fontWeight: 500 }}
            />
          ))}
      </div>
    ),
  },
  {
    field: "details",
    headerName: "Details",
    description: "This column has a value getter and is not sortable.",
    sortable: false,
    width: 100,
    valueGetter: (value, row) => `${row.firstName || ""} ${row.lastName || ""}`,
    renderCell: (params) => (
      <Link
        className="h-full mx-auto grid place-content-center"
        href={params.row.details}
      >
        <Image src={linkIcon} alt="Link Icon" width={15} height={15} />
      </Link>
    ),
  },
];

const paginationModel = { page: 0, pageSize: 10 };

const getJobs = async () => {
  const { data } = await axios.get(jobsApi());
  const array: Array<string> = data
    .split("------------ | ------- | -------\n")[1]
    .split("\n");
  const jobs = array.map(async (item, idx) => {
    const [namePart, url, regions] = item.split("|");
    const companyMatch = namePart.match(/\[(.*?)\]\((.*?)\)/);
    let technologies = "";

    if (companyMatch !== null) {
      try {
        const { data } = await axios.get(getJobDetails(companyMatch[2].trim()));
        technologies = data
          ?.split("Company technologies")[1]
          ?.split("Office locations")[0];
      } catch (e) {
        console.log(e);
      }
    }

    return companyMatch && url && regions && technologies
      ? {
          id: idx + 1,
          company: companyMatch ? companyMatch[1] : "",
          url: url.trim(),
          details: companyMatch ? companyMatch[2].trim() : "",
          regions: regions,
          technologies: technologies.toLowerCase(),
        }
      : "";
  });

  const filteredJobs = (await Promise.all(jobs)).filter((job) => job !== "");

  return filteredJobs;
};
