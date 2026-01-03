import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 9.5a8.5 8.5 0 0 1-8.5 8.5" />
      <path d="M3 9.5A8.5 8.5 0 0 0 11.5 18" />
      <path d="M12 2a8.5 8.5 0 0 0-8.5 8.5" />
      <circle cx="12" cy="9.5" r="1.5" />
    </svg>
  );
}
