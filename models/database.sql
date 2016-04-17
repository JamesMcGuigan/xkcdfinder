DROP TABLE scrape_xkcd;
CREATE TABLE scrape_xkcd
(
    id INTEGER PRIMARY KEY NOT NULL,
    url TEXT,
    title TEXT,
    alttext TEXT,
    image TEXT
);
CREATE UNIQUE INDEX scrape_xkcd_id_uindex ON scrape_xkcd (id);
