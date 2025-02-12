"use client";

import React from "react";
import SearchField from "./searchField";
import useStore from "../store";

function Filter() {
  const { value } = useStore();

  return (
    <div className="flex flex-col md:flex-row py-4 md:gap-5 gap-3 lg:gap-10">
      <SearchField
        label="Search by Name"
        placeholder="E.g: Amazon, 10up"
        id="name"
        name="name"
      />

      <SearchField
        label="Search by Region"
        placeholder="Eg: Worldwide, Europe, Asia etc"
        id="regions"
        name="regions"
        helperText="Type a region and press 'Enter' to add it as a tag. Repeat to include multiple regions"
        tags={value.added_regions}
      />

      <SearchField
        label="Search by Technologies"
        placeholder="Eg: Javascript, PHP, AWS etc"
        id="technologies"
        name="technologies"
        helperText="Type a technology and press 'Enter' to add it as a tag. Repeat to include multiple technologies"
        tags={value.added_technologies}
      />
    </div>
  );
}

export default Filter;
