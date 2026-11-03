const paths = {
  arrow: "M7 17 17 7M7 7h10v10",
  copy: "M9 5H5v14h10v-4M9 3h10v12H9z",
  download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
  code: "m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16",
  check: "m5 12 4 4L19 6",
  github:
    "M9 19c-4 1-4-2-6-2m12 4v-3c0-1-.3-2-1-2 3 0 6-1 6-6 0-1-.5-3-1.5-4 .2-1 .2-2-.3-3-2 0-3 1-4 2-2-.5-4-.5-6 0-1-1-2-2-4-2-.5 1-.5 2-.3 3C3.5 7 3 9 3 10c0 5 3 6 6 6-.7 0-1 1-1 2v3",
} as const;
export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof paths;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
