/** Subjects to learn. Each one is a folder of Markdown lessons in content/learn/<slug>/
 *  (NN-lesson-id.md, read at build time). To add a subject, add it here and create the folder. */
export interface Subject {
  slug: string;
  name: string;
  /** 2–4 letter tag for chips */
  tag: string;
  blurb: string;
}

export const SUBJECTS: Subject[] = [
  {
    slug: "python",
    name: "Python",
    tag: "PY",
    blurb:
      "How the language really works: names and mutability, collections, functions, generators, classes, errors, typing, async, testing and pandas, with the traps tests like to set.",
  },
  {
    slug: "react",
    name: "React & TypeScript",
    tag: "FE",
    blurb:
      "Components, state, effects, refs, forms, performance, state management, data fetching and streaming, TypeScript, the JavaScript underneath, security and testing.",
  },
];
