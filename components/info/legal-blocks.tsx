import Link from "next/link"

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "pWithLink"; before: string; linkLabel: string; after: string; href: string }

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "p") {
          return <p key={index}>{block.text}</p>
        }
        if (block.type === "ul") {
          return (
            <ul key={index}>
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={index}>
            {block.before}
            <Link
              href={block.href}
              className="font-medium text-purple-900 underline-offset-2 hover:underline"
            >
              {block.linkLabel}
            </Link>
            {block.after}
          </p>
        )
      })}
    </>
  )
}
