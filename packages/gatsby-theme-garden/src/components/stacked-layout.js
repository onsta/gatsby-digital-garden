import React from "react";
import { useWindowWidth } from "@react-hook/window-size";
import { useStackedPagesProvider } from "react-stacked-pages-hook";
import { dataToNote, dataToSlug } from "../utils/data-to-note";
import Note from "./note";
import NoteWrapper from "./note-wrapper";
import Header from "./header";

import "./theme.css";
import "./stacked-layout.css";

const NotesLayout = ({ location, slug, data }) => {
  const windowWidth = useWindowWidth();

  const [
    stackedPages,
    stackedPageStates,
    ContextProvider,
    PageIndexProvider,
    scrollContainer,
  ] = useStackedPagesProvider({
    firstPage: { slug: dataToSlug(data), data },
    location,
    processPageQuery: dataToNote,
    pageWidth: 625,
  });

  return (
    <div className="layout">
      <Header />

      <div className="note-columns-scrolling-container" ref={scrollContainer}>
        <div
          className="note-columns-container"
          style={{ width: 625 * (stackedPages.length + 1) }}
        >
          <ContextProvider>
            {windowWidth > 800 ? (
              <React.Fragment>
                {stackedPages.map((page, i) => (
                  <NoteWrapper
                    key={page.slug}
                    PageIndexProvider={PageIndexProvider}
                    i={i}
                    slug={page.slug}
                    title={page.data.title}
                    {...stackedPageStates[page.slug]}
                  >
                    <Note {...page.data} />
                  </NoteWrapper>
                ))}
              </React.Fragment>
            ) : (
              <NoteWrapper
                PageIndexProvider={PageIndexProvider}
                i={stackedPages.length - 1}
                slug={stackedPages[stackedPages.length - 1].slug}
                title={stackedPages[stackedPages.length - 1].data.title}
              >
                <Note {...stackedPages[stackedPages.length - 1].data} />
              </NoteWrapper>
            )}
          </ContextProvider>
        </div>
      </div>
    </div>
  );
};

export default NotesLayout;
