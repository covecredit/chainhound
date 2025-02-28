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
  "The Lord examines the righteous, but the wicked, those who love violence, he hates with a passion. - Psalm 11:5",
  "For we must all appear before the judgment seat of Christ, so that each of us may receive what is due us for the things done while in the body, whether good or bad. - 2 Corinthians 5:10",
  "For God will bring every deed into judgment, including every hidden thing, whether it is good or evil. - Ecclesiastes 12:14",
  "Nothing in all creation is hidden from God's sight. Everything is uncovered and laid bare before the eyes of him to whom we must give account. - Hebrews 4:13",
  "For the word of God is alive and active. Sharper than any double-edged sword, it penetrates even to dividing soul and spirit, joints and marrow; it judges the thoughts and attitudes of the heart. - Hebrews 4:12",
  "But I tell you that everyone will have to give account on the day of judgment for every empty word they have spoken. - Matthew 12:36"
];

// Randomly select a Bible verse to log to console
const randomVerse = bibleVerses[Math.floor(Math.random() * bibleVerses.length)];
console.log(`\n${randomVerse}\n`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);