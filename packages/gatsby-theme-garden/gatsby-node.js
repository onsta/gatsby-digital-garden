const fs = require(`fs`);
const path = require(`path`);
const { urlResolve, createContentDigest } = require(`gatsby-core-utils`);
const slugify = require(`slugify`);

// These are customizable theme options we only need to check once
let basePath;
let contentPath;
let roamUrl;
let rootNote;

exports.onPreBootstrap = ({ store }, themeOptions) => {
  const { program } = store.getState();

  basePath = themeOptions.basePath || `/`;
  contentPath = themeOptions.contentPath;
  roamUrl = themeOptions.roamUrl;
  rootNote = themeOptions.rootNote;

  if (contentPath) {
    const dir = path.isAbsolute(contentPath)
      ? contentPath
      : path.join(program.directory, contentPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
};

exports.onCreateNode = ({ node, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === `RoamPage` && node.sourceUrl === roamUrl) {
    createNodeField({
      node,
      name: `slug`,
      value: urlResolve(basePath, slugify(node.title)),
    });
  }
  if (node.internal.type === `RoamBlock` && node.sourceUrl === roamUrl) {
    if (!node.uid) {
      return;
    }
    createNodeField({
      node,
      name: `slug`,
      value: urlResolve(basePath, slugify(node.uid)),
    });
  }
  if (
    node.internal.type === `File` &&
    node.sourceInstanceName === contentPath
  ) {
    createNodeField({
      node,
      name: `slug`,
      value: urlResolve(basePath, path.parse(node.relativePath).dir, node.name),
    });
  }
};

async function copyFile(from, to) {
  return fs.promises.writeFile(to, await fs.promises.readFile(from));
}

exports.createPages = async ({ graphql, actions }) => {
  const { createPage } = actions;

  if (contentPath) {
    const result = await graphql(
      `
        {
          allFile {
            nodes {
              id
              sourceInstanceName
              fields {
                slug
              }
            }
          }
        }
      `
    );

    if (result.errors) {
      console.log(result.errors);
      throw new Error(`Could not query notes`, result.errors);
    }

    await copyFile(
      path.join(__dirname, "./templates/local-file.template"),
      path.join(__dirname, "./src/templates/local-file.js")
    );

    const LocalFileTemplate = require.resolve(`./src/templates/local-file`);

    const localFiles = result.data.allFile.nodes.filter(
      (node) => node.sourceInstanceName === contentPath
    );

    localFiles.forEach((node) => {
      createPage({
        path: node.fields.slug,
        component: LocalFileTemplate,
        context: {
          id: node.id,
        },
      });
    });

    if (rootNote) {
      const root = localFiles.find((node) => node.fields.slug === rootNote);
      if (root) {
        createPage({
          path: basePath,
          component: LocalFileTemplate,
          context: {
            id: root.id,
          },
        });
      }
    }
  } else {
    try {
      await fs.promises.unlink(
        path.join(__dirname, "./src/templates/local-file.js")
      );
    } catch (err) {}
  }

  if (roamUrl) {
    const result = await graphql(
      `
        {
          allRoamPage {
            nodes {
              id
              sourceUrl
              fields {
                slug
              }
            }
          }
          allRoamBlock {
            nodes {
              id
              sourceUrl
              fields {
                slug
              }
            }
          }
        }
      `
    );

    if (result.errors) {
      console.log(result.errors);
      throw new Error(`Could not query Roam`, result.errors);
    }

    await copyFile(
      path.join(__dirname, "./templates/roam-block.template"),
      path.join(__dirname, "./src/templates/roam-block.js")
    );
    await copyFile(
      path.join(__dirname, "./templates/roam-page.template"),
      path.join(__dirname, "./src/templates/roam-page.js")
    );

    const RoamBlockTemplate = require.resolve(`./src/templates/roam-block`);
    const RoamPageTemplate = require.resolve(`./src/templates/roam-page`);

    const roamBlocks = result.data.allRoamBlock.nodes.filter(
      (node) => node.sourceUrl === roamUrl
    );

    roamBlocks.forEach((node) =>
      createPage({
        path: node.fields.slug,
        component: RoamBlockTemplate,
        context: {
          id: node.id,
        },
      })
    );

    const roamPages = result.data.allRoamPage.nodes.filter(
      (node) => node.sourceUrl === roamUrl
    );

    roamPages.forEach((node) =>
      createPage({
        path: node.fields.slug,
        component: RoamPageTemplate,
        context: {
          id: node.id,
        },
      })
    );

    if (rootNote) {
      const root = roamPages.find((node) => node.fields.slug === rootNote);
      if (root) {
        createPage({
          path: basePath,
          component: RoamPageTemplate,
          context: {
            id: root.id,
          },
        });
      }
    }
  } else {
    try {
      await fs.promises.unlink(
        path.join(__dirname, "./src/templates/roam-block.js")
      );
      await fs.promises.unlink(
        path.join(__dirname, "./src/templates/roam-page.js")
      );
    } catch (err) {}
  }
};

exports.sourceNodes = (
  { actions: { createTypes, createNode }, schema },
  { basePath = `/`, homeText = `~`, breadcrumbSeparator = `/` }
) => {
  // Create the Garden type to solidify the field data types
  createTypes(`type GardenConfig implements Node {
basePath: String!
}`);

  // create garden data from plugin config
  const gardenConfig = {
    basePath,
  };

  createNode({
    ...gardenConfig,
    id: `gatsby-theme-garden-config`,
    parent: null,
    children: [],
    internal: {
      type: `GardenConfig`,
      contentDigest: createContentDigest(gardenConfig),
      content: JSON.stringify(gardenConfig),
      description: `Garden Config`,
    },
  });
};

exports.onPreExtractQueries = async ({ store }) => {
  const program = store.getState().program;

  if (contentPath && roamUrl) {
    await copyFile(
      path.join(__dirname, "./fragments/file-and-roam.fragment"),
      `${program.directory}/.cache/fragments/garden-fragments.js`
    );
  } else if (contentPath) {
    await copyFile(
      path.join(__dirname, "./fragments/file.fragment"),
      `${program.directory}/.cache/fragments/garden-fragments.js`
    );
  } else if (roamUrl) {
    await copyFile(
      path.join(__dirname, "./fragments/roam.fragment"),
      `${program.directory}/.cache/fragments/garden-fragments.js`
    );
  }
};
