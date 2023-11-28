import classNames from 'classnames';
import { useState } from 'react';
import Default from '../components/Default';
import OpenSource from '../components/OpenSource';
import SEO from '../components/SEO';
import slug from '../utils/slug';

const pens = [
  { title: 'Autosave', hash: 'RRYBEP' },
  { title: 'Class vs Inline Style', hash: 'jrvpQL' },
  { title: 'Form Submit', hash: 'ZOMjmo' },
  { title: 'Snow Toolbar Tooltips', hash: 'ozYEMo' },
  { title: 'Autogrow Height', hash: 'dOqrVm' },
  { title: 'Custom Fonts', hash: 'gLBYam' },
  { title: 'Quill Playground', hash: 'KzZqZx' },
].map(pen => ({ ...pen, slug: slug(pen.title) }));

const isBrowser = typeof window !== 'undefined';

const Playground = () => {
  const [selectedPen, setSelectedPen] = useState(() => {
    if (!isBrowser) return pens.length - 1;
    const { hash } = window.location;
    const index = hash ? pens.findIndex(pen => pen.slug === hash.slice(1)) : -1;
    return index === -1 ? pens.length - 1 : index;
  });
  return (
    <Default>
      <div className="container">
        <div id="playground-container">
          <h1>Interactive Playground</h1>
          <iframe
            src={`//codepen.io/anon/embed/${pens[selectedPen].hash}/?height=500&amp;editable=true&amp;embed-version=2&amp;theme-id=23269&amp;default-tab=js%2Cresult&amp;user=anon`}
            height="500"
            allowFullScreen
          ></iframe>
        </div>
        <div id="gallery-container">
          {pens.map((pen, index) => (
            <div
              key={pen.slug}
              className={classNames('four', 'columns', {
                'selected-pen': selectedPen == index,
              })}
            >
              <a
                href={`/playground/#${slug(pen.title)}`}
                title={pen.title}
                data-id={pen.hash}
                onClick={e => {
                  setSelectedPen(index);
                }}
              >
                <img
                  alt={`${pen.title} Screenshot`}
                  src={`https://codepen.io/quill/pen/${pen.hash}/image/small.png`}
                />
                <span className="pen-label">{pen.title}</span>
              </a>
            </div>
          ))}
        </div>
        <OpenSource />
      </div>
    </Default>
  );
};

export default Playground;

export const Head = () => (
  <>
    <SEO title="Interactive Playground" />
    <link rel="stylesheet" href="/assets/css/base.css" />
    <link rel="stylesheet" href="/assets/css/styles.css" />
  </>
);
