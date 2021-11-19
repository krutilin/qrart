import React, { useState, useCallback, useEffect, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import styles from "../styles/Home.module.css";

const texts = {
  en: {
    title: "",
  },
  ru: {
    title: "",
  },
};

export async function getServerSideProps(context) {
  const { locale } = context;

  return {
    props: {
      texts: texts[locale],
    },
  };
}

export default function Home({ texts }) {
  const input = useRef();
  const code = useRef();

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(null);

  const [img, setImg] = useState(null);

  const sendData = useCallback(async () => {
    const data = input.current.value;

    if (data) {
      setLoading(true);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data }),
      });
      const json = await res.json();
      setLoading(false);
      //input.current.value = "";
      setUrl(json.url);
      setImg(json.img);

      setTimeout(() => {
        if (code) {
          code?.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
      }, 0);
    }
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>QRcode pixel ART generator</title>
        <meta
          name="description"
          content="Generate cool pixel art instead of boring QR code, make so-called halftone QR codes in a fun way"
        />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css?family=Press+Start+2P"
          rel="stylesheet"
        />
      </Head>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>QR ART generator</h1>
        </header>

        <div className={styles.content}>
          <section className="message-left">
            <i className="nes-bcrikko"></i>
            <p className="nes-balloon nes-pointer from-left">
              Generate cool pixel art instead of boring QR code
            </p>
          </section>

          <section className="nes-container with-title section">
            <h3 className="title">Your data</h3>
            <input ref={input} type="text" className="nes-input" />
            <button className="nes-btn is-primary" onClick={sendData}>
              Generate
            </button>
          </section>

          {url && (
            <section ref={code} className="nes-container with-title section">
              <h3 className="title">Your QR code</h3>
              <div className="code-container animate__animated animate__bounceInRight">
                <img className="qr" src={url} alt="QR" />
              </div>
            </section>
          )}

          {/*
            <section className="topic">
              <h2 id="1">
                <a href="#1">#</a>
                Topic 1
              </h2>
              <p>Text 1</p>
            </section>
          */}
        </div>
        <footer><span>©2021</span> <a href="https://github.com/alexslavr" target="_blank" rel="noopener noreferrer">@alexslavr</a> <span> </span> <a href="https://github.com/krutilin" target="_blank" rel="noopener noreferrer">@krutilin</a></footer>
      </main>

    </div>
  );
}
