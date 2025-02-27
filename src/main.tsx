import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Bible verses related to catching bad guys
const bibleVerses = [
  "For there is nothing hidden that will not be disclosed, and nothing concealed that will not be known or brought out into the open. - Luke 8:17",
  "The Lord detests dishonest scales, but accurate weights find favor with him. - Proverbs 11:1",
  "For the love of money is a root of all kinds of evil. - 1 Timothy 6:10",
  "Whoever walks in integrity walks securely, but whoever takes crooked paths will be found out. - Proverbs 10:9",
  "The integrity of the upright guides them, but the unfaithful are destroyed by their duplicity. - Proverbs 11:3",
  "Do not be deceived: God cannot be mocked. A man reaps what he sows. - Galatians 6:7",
  "The wicked flee though no one pursues, but the righteous are as bold as a lion. - Proverbs 28:1",
  "But if you fail to do this, you will be sinning against the Lord; and you may be sure that your sin will find you out. - Numbers 32:23",
  "For the eyes of the Lord range throughout the earth to strengthen those whose hearts are fully committed to him. - 2 Chronicles 16:9",
  "The Lord examines the righteous, but the wicked, those who love violence, he hates with a passion. - Psalm 11:5"
];

// Randomly select a Bible verse to log to console
const randomVerse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
console.log(`\n${randomVerse}\n`);

// The Lord's Prayer
console.log(`
Our Father, who art in heaven,
hallowed be thy name;
thy kingdom come;
thy will be done on earth as it is in heaven.
Give us this day our daily bread;
and forgive us our trespasses
as we forgive those who trespass against us;
and lead us not into temptation,
but deliver us from evil.
Amen.
`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);