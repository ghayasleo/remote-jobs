import React, { InputHTMLAttributes } from "react";
import { InputValues } from "../page";
import { Chip } from "@mui/material";
import useStore from "../store";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  tags?: string;
}

function SearchField({ label, helperText, tags, ...props }: Props) {
  const { value, setValue } = useStore();

  const name = props.name as keyof InputValues;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue({ ...value, [name]: e.target.value });
  };

  const addTag = (val: string) => {
    if (name === "regions" || name === "technologies") {
      setValue({
        ...value,
        [name]: "",
        [`added_${name}`]: value[`added_${name}`]
          ? `${value[`added_${name}`]},${val}`
          : val,
      });
    }
  }

  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") addTag(value[name]);
  }

  const onDelete = (tag: string) => {
    if (name === "regions" || name === "technologies") {
      setValue({
        ...value,
        [`added_${name}`]: value[`added_${name}`]
          .split(",")
          .filter((t) => t !== tag)
          .join(","),
      });
    }
  };

  return (
    <div className="flex-1">
      <label htmlFor={props.id} className="block lg:mb-2 mb-1 text-gray-500 lg:text-base text-sm">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          {...props}
          value={value[name]}
          onChange={onChange}
          onKeyUp={onKeyUp}
          className="w-full px-4 py-2 border border-gray-300 lg:text-base text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
        <button onClick={() => addTag(value[name])} className="absolute inset-y-[1px] right-[1px] flex items-center px-3 rounded-full bg-[#fafafa]">
          <svg className="h-5 w-5 text-gray-500"xmlns="http://www.w3.org/2000/svg"fill="none"viewBox="0 0 24 24"stroke="currentColor"><path strokeLinecap="round"strokeLinejoin="round"strokeWidth="2"d="M21 21l-4.35-4.35M9 17a8 8 0 100-16 8 8 0 000 16z"/></svg>
        </button>
      </div>
      <small className="text-[11px]">{helperText}</small>

      {tags && (
        <div className="mt-2 flex flex-wrap gap-1">
          {tags.split(",").map((tag, idx) => (
            <Chip
              size="small"
              key={idx}
              label={tag}
              sx={{ fontSize: 12, paddingInline: 0.5, fontWeight: 500 }}
              onDelete={() => onDelete(tag)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchField;
