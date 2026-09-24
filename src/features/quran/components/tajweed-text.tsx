import { Fragment, type ReactNode } from "react";

export const TAJWEED_RULES = {
    h: {
        label: "Hamzat ul Wasl",
        className: "text-[#AAAAAA] dark:text-[#B8B8B8]",
    },
    s: {
        label: "Silent letter",
        className: "text-[#AAAAAA] dark:text-[#B8B8B8]",
    },
    l: {
        label: "Lam Shamsiyyah",
        className: "text-[#AAAAAA] dark:text-[#B8B8B8]",
    },
    n: {
        label: "Normal prolongation",
        className: "text-[#537FFF] dark:text-[#86A0FF]",
    },
    p: {
        label: "Permissible prolongation",
        className: "text-[#4050FF] dark:text-[#929CFF]",
    },
    m: {
        label: "Necessary prolongation",
        className: "text-[#000EBC] dark:text-[#7180FF]",
    },
    q: {
        label: "Qalqalah",
        className: "text-[#DD0008] dark:text-[#FF646A]",
    },
    o: {
        label: "Obligatory prolongation",
        className: "text-[#2144C1] dark:text-[#6685F0]",
    },
    c: {
        label: "Ikhafa Shafawi",
        className: "text-[#D500B7] dark:text-[#FF62E4]",
    },
    f: {
        label: "Ikhafa",
        className: "text-[#9400A8] dark:text-[#D95AEC]",
    },
    w: {
        label: "Idgham Shafawi",
        className: "text-[#58B800] dark:text-[#82D443]",
    },
    i: {
        label: "Iqlab",
        className: "text-[#26BFFD] dark:text-[#53D5F8]",
    },
    a: {
        label: "Idgham with Ghunnah",
        className: "text-[#169777] dark:text-[#4CC7AA]",
    },
    u: {
        label: "Idgham without Ghunnah",
        className: "text-[#169200] dark:text-[#68C957]",
    },
    d: {
        label: "Idgham Mutajanisayn",
        className: "text-[#A1A1A1] dark:text-[#C0C0C0]",
    },
    b: {
        label: "Idgham Mutaqaribayn",
        className: "text-[#A1A1A1] dark:text-[#C0C0C0]",
    },
    g: {
        label: "Ghunnah",
        className: "text-[#FF7E1E] dark:text-[#FF9C4A]",
    },
} as const;

const TAJWEED_TOKEN_START = /^\[([a-z])(?::(\d+))?\[/;

type TajweedRuleCode = keyof typeof TAJWEED_RULES;

function isTajweedRuleCode(code: string): code is TajweedRuleCode {
    return code in TAJWEED_RULES;
}

function normalizeLegacyTajweedCharacters(text: string) {
    return text.replace(/\[ٮٰ\]/g, "ىٰ").replace(/ٮ/g, "ى").replace(/ٲ/g, "ا");
}

type TajweedNode =
    | string
    | {
          code: string;
          identifier?: string;
          children: TajweedNode[];
      };

function parseTajweedNodes(
    text: string,
    startIndex = 0,
    stopAtClosingBracket = false,
): { nodes: TajweedNode[]; nextIndex: number } {
    const nodes: TajweedNode[] = [];
    let plainText = "";
    let index = startIndex;

    function flushPlainText() {
        if (!plainText) return;
        nodes.push(normalizeLegacyTajweedCharacters(plainText));
        plainText = "";
    }

    while (index < text.length) {
        if (text[index] === "]" && stopAtClosingBracket) {
            flushPlainText();
            return { nodes, nextIndex: index + 1 };
        }

        if (text[index] === "[") {
            const tokenStart = text.slice(index).match(TAJWEED_TOKEN_START);

            if (tokenStart) {
                flushPlainText();
                const [, code, identifier] = tokenStart;
                const childResult = parseTajweedNodes(
                    text,
                    index + tokenStart[0].length,
                    true,
                );
                nodes.push({
                    code,
                    identifier,
                    children: childResult.nodes,
                });
                index = childResult.nextIndex;
                continue;
            }
        }

        plainText += text[index];
        index += 1;
    }

    flushPlainText();
    return { nodes, nextIndex: index };
}

function getNodeText(node: TajweedNode): string {
    return typeof node === "string"
        ? node
        : node.children.map(getNodeText).join("");
}

export function getPlainQuranText(text: string) {
    return parseTajweedNodes(text).nodes.map(getNodeText).join("");
}

function renderTajweedNode(node: TajweedNode, key: string): ReactNode {
    if (typeof node === "string") {
        return <Fragment key={key}>{node}</Fragment>;
    }

    const rule = isTajweedRuleCode(node.code) ? TAJWEED_RULES[node.code] : null;
    const children = node.children.map((child, index) =>
        renderTajweedNode(child, `${key}-${index}`),
    );

    if (!rule) {
        return <Fragment key={key}>{children}</Fragment>;
    }

    return (
        <span
            key={key}
            className={rule.className}
            title={rule.label}
            data-tajweed={node.identifier}
        >
            {children}
        </span>
    );
}

export default function TajweedText({ text }: { text: string }) {
    return parseTajweedNodes(text).nodes.map((node, index) =>
        renderTajweedNode(node, `tajweed-${index}`),
    );
}
