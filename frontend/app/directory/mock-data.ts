export interface TreeNode {
  id: string
  name: string
  type: "folder" | "file"
  children?: TreeNode[]
}

export const mockFileTree: TreeNode[] = [
  {
    id: "1",
    name: ".localized",
    type: "file",
  },
  {
    id: "2",
    name: "Documents",
    type: "folder",
    children: [
      {
        id: "2-1",
        name: "Beam-reverse-engine",
        type: "folder",
        children: [
          { id: "2-1-1", name: "README.md", type: "file" },
          { id: "2-1-2", name: "main.py", type: "file" },
          { id: "2-1-3", name: "config.json", type: "file" },
        ],
      },
      {
        id: "2-2",
        name: "CFD_Software_Demo",
        type: "folder",
        children: [
          { id: "2-2-1", name: "simulation.py", type: "file" },
          { id: "2-2-2", name: "results.csv", type: "file" },
        ],
      },
      {
        id: "2-3",
        name: "Demo-App",
        type: "folder",
        children: [
          { id: "2-3-1", name: "index.tsx", type: "file" },
          { id: "2-3-2", name: "package.json", type: "file" },
        ],
      },
      {
        id: "2-4",
        name: "GitHub",
        type: "folder",
        children: [],
      },
      {
        id: "2-5",
        name: "JDownloader 2",
        type: "folder",
        children: [],
      },
      {
        id: "2-6",
        name: "Paraview-Domino-demo",
        type: "folder",
        children: [],
      },
      {
        id: "2-7",
        name: "School",
        type: "folder",
        children: [
          { id: "2-7-1", name: "Chapter 12 orientation.pdf", type: "file" },
          { id: "2-7-2", name: "notes.md", type: "file" },
        ],
      },
      {
        id: "2-8",
        name: "Scraping470",
        type: "folder",
        children: [],
      },
      {
        id: "2-9",
        name: "cfd-post-processing",
        type: "folder",
        children: [],
      },
      {
        id: "2-10",
        name: "cgns-conversion",
        type: "folder",
        children: [],
      },
      {
        id: "2-11",
        name: "claude-web",
        type: "folder",
        children: [
          { id: "2-11-1", name: "frontend", type: "folder", children: [
            { id: "2-11-1-1", name: "package.json", type: "file" },
            { id: "2-11-1-2", name: "tsconfig.json", type: "file" },
          ]},
          { id: "2-11-2", name: "README.md", type: "file" },
        ],
      },
      {
        id: "2-12",
        name: "fix_shift_s3",
        type: "folder",
        children: [],
      },
      {
        id: "2-13",
        name: "generate-shift-pts",
        type: "folder",
        children: [],
      },
      {
        id: "2-14",
        name: "internal-anew-demo",
        type: "folder",
        children: [],
      },
      {
        id: "2-15",
        name: "internal-cfd-knowledgebase",
        type: "folder",
        children: [],
      },
      {
        id: "2-16",
        name: "nuke aws",
        type: "folder",
        children: [],
      },
      {
        id: "2-17",
        name: "paraview-trame-components",
        type: "folder",
        children: [],
      },
      {
        id: "2-18",
        name: "physics-platform",
        type: "folder",
        children: [],
      },
      {
        id: "2-19",
        name: "platformdemo",
        type: "folder",
        children: [],
      },
      {
        id: "2-20",
        name: "post-processing-vtk",
        type: "folder",
        children: [],
      },
      {
        id: "2-21",
        name: "uagi-platform",
        type: "folder",
        children: [],
      },
      {
        id: "2-22",
        name: "upload_mom_s3",
        type: "folder",
        children: [],
      },
      {
        id: "2-23",
        name: ".git",
        type: "folder",
        children: [],
      },
      { id: "2-24", name: "\\.txt", type: "file" },
      { id: "2-25", name: "Beam-reverse-engine.zip", type: "file" },
      { id: "2-26", name: "Chapter 12 orientation.pdf", type: "file" },
      { id: "2-27", name: "README.md", type: "file" },
      { id: "2-28", name: "physics-platform.code-workspace", type: "file" },
      { id: "2-29", name: ".DS_Store", type: "file" },
      { id: "2-30", name: ".localized", type: "file" },
    ],
  },
  {
    id: "3",
    name: "Downloads",
    type: "folder",
    children: [
      {
        id: "3-1",
        name: "239450118",
        type: "folder",
        children: [],
      },
      {
        id: "3-2",
        name: "239450118 2",
        type: "folder",
        children: [],
      },
      {
        id: "3-3",
        name: "Cooper.JW_Stock-7325fd8e5c9d43f2b7badc9a8543ba78-v0",
        type: "folder",
        children: [],
      },
      {
        id: "3-4",
        name: "Example",
        type: "folder",
        children: [],
      },
      {
        id: "3-5",
        name: "Install Spotify.app",
        type: "folder",
        children: [],
      },
      {
        id: "3-6",
        name: "LXR718_spyder-3bd5d86128ac48108de63ce6505ff81b-v0",
        type: "folder",
        children: [],
      },
      {
        id: "3-7",
        name: "Peugeot2008A94",
        type: "folder",
        children: [],
      },
      {
        id: "3-8",
        name: "Peugeot2008A94_modland",
        type: "folder",
        children: [],
      },
    ],
  },
]
