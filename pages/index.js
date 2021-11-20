import React, { useState, useCallback, useEffect, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import ImageGallery from "react-image-gallery";
import styles from "../styles/Home.module.css";

// TODO: "Loading ..."
const texts = {
  en: {
    title: "QRcode pixel ART generator",
    description:
      "Generate cool pixel art instead of boring QR code, make so-called halftone QR codes in a fun way",
    h1: "QR ART generator",
    p: "Generate cool pixel art instead of boring QR code",
    h3_title: "Your data",
    h4: "URL or text",
    button: "Generate",
    qr: "Your QR code",
    h3_topic_idea: "Idea",
    p_topic_idea: "",
    h3_topic_share: "Share",
    h3_topic_email: "Have a question",
    p_topic_email: "Found a bug, need a feature. Just drop us a letter ",
  },
  ru: {
    title: "QRcode пиксель ART генератор",
    description:
      "Создавай крутые пиксельные изображения вместо скучных QR-кодов, так называемые полутоновые QR-коды.",
    h1: "QR ART генератор",
    p: "Создавай крутые пиксельные рисунки вместо скучного QR-кода",
    h3_title: "Введите данные",
    h4: "URL или текст",
    button: "Генерируй!",
    qr: "Твой QR код",
    h3_topic_idea: "Идея",
    p_topic_idea: "Идея",
    h3_topic_share: "Расшарь в сеточки",
    h3_topic_email: "Есть вопросы",
    p_topic_email: "Нашли баг, нужна фича. Ждем письмо на ",
  },
};

export async function getServerSideProps(context) {
  const { locale } = context;

  const cdn_url =
    "https://cdn-img.fra1.cdn.digitaloceanspaces.com/qrart-app/png/";
  const images = ["cat", "dog", "frog", "lol", "troll", "mona-lisa", "yoda"];

  const galleryItems = images.map((image) => ({
    original: `${cdn_url}${image}.png`,
  }));

  return {
    props: {
      texts: texts[locale],
      galleryItems,
    },
  };
}

export default function Home({ texts, galleryItems }) {
  const input = useRef();
  const code = useRef();
  const gallery = useRef();

  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(null);
  const [showGallery, setShowGallery] = useState(false);

  const sendData = useCallback(async () => {
    let data = input.current.value;

    if (!data) {
      data = "https://qrart.app/";
    }
    setLoading(true);
    const imageIndex = showGallery ? gallery?.current.getCurrentIndex() : null;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data, index: imageIndex }),
    });
    const json = await res.json();
    setLoading(false);
    input.current.value = data;
    setUrl(json.url);

    setTimeout(() => {
      if (code) {
        code?.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 0);
  }, [input, gallery, showGallery]);

  return (
    <div className={styles.container}>
      <Head>
        <title>{texts.title}</title>
        <meta name="description" content={texts.description} />
        <link rel="icon" href="/favicon.ico" />
        <link
          href="https://fonts.googleapis.com/css?family=Press+Start+2P"
          rel="stylesheet"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          defer
          data-domain="qrart.app"
          src="https://itcount.me/js/plausible.js"
        />
      </Head>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>{texts.h1}</h1>
        </header>

        <div className={styles.content}>
          <section className="message-left">
            <i className="nes-bcrikko"></i>
            <p className="nes-balloon nes-pointer from-left">{texts.p}</p>
          </section>

          <section className="nes-container with-title section">
            <h3 className="title">{texts.h3_title}</h3>
            <h4>{texts.h4}</h4>
            <input ref={input} type="text" className="nes-input" />
            <label>
              <input
                type="checkbox"
                className="nes-checkbox"
                checked={showGallery}
                onChange={(e) => setShowGallery(e.target.value)}
              />
              <span>Выбрать картинку</span>
            </label>
            {showGallery && (
              <ImageGallery
                ref={gallery}
                additionalClass="img-gallery animate__animated animate__bounceInDown"
                items={galleryItems}
                infinite={false}
                showPlayButton={false}
                showFullscreenButton={false}
              />
            )}
            {loading ? (
              <div className="loader nes-badge animate__animated animate__pulse animate__infinite">
                <span className="is-error">Loading ...</span>
              </div>
            ) : (
              <button className="nes-btn is-primary" onClick={sendData}>
                {texts.button}
              </button>
            )}
          </section>

          {url && (
            <section ref={code} className="nes-container with-title section">
              <h3 className="title">{texts.qr}</h3>
              <div className="code-container animate__animated animate__bounceInRight">
                <img className="qr" src={url} alt="QR" />

                <div>
                  <a
                    className="code-button nes-btn is-warning"
                    href={url}
                    download="qrcode.png"
                  >
                    Download
                  </a>
                </div>
              </div>
            </section>
          )}

          {/*
          <section className="topic">
            <h3 id="1">
              <a href="#1">#</a>
              {texts.h3_topic_idea}
            </h3>
            <p>{texts.p_topic_idea}</p>
          </section>
          */}
          <section className="topic">
            <h3 id="email">
              <a href="#email">#</a>
              {texts.h3_topic_email}
            </h3>
            <p>
              {texts.p_topic_email}{" "}
              <a href="mailto:support@qrart.app">support@qrart.app</a>
            </p>
          </section>
        </div>
        <footer>
          <span>©2021</span>{" "}
          <a
            href="https://github.com/alexslavr"
            target="_blank"
            rel="noopener noreferrer"
          >
            @alexslavr
          </a>{" "}
          <span> </span>{" "}
          <a
            href="https://github.com/krutilin"
            target="_blank"
            rel="noopener noreferrer"
          >
            @krutilin
          </a>
        </footer>
      </main>
    </div>
  );
}
