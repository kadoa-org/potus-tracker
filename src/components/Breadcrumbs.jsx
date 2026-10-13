import Link from "next/link";

// GOV.UK breadcrumbs, as on the sibling sites' insight pages: links up the hierarchy, the current page last.
export function Breadcrumbs({ items }) {
  return (
    <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
      <ol className="govuk-breadcrumbs__list">
        {items.map((it) => (
          <li className="govuk-breadcrumbs__list-item" key={it.label}>
            {it.href ? (
              <Link className="govuk-breadcrumbs__link" href={it.href}>
                {it.label}
              </Link>
            ) : (
              <span aria-current="page">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
