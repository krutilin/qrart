import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "../styles/Home.module.css";
import Meta from "../components/Meta";
import RadioGroup from "../components/RadioGroup";
import Dropzone from "../components/Dropzone";
import Footer from "../components/Footer";
import GiphyPicker from "../components/GiphyPicker";
import TemplatePicker from "../components/TemplatePicker";

const texts = {
  en: {
    title: "QRcode pixel ART generator",
    description:
      "Make animated QR GIFs from GIPHY backgrounds and your own links",
    h1: "Animated QR GIFs",
    p: "Turn any link into a moving QR code with GIF energy.",
    h3_title: "Make it move",
    h4: "Paste URL or text",
    button: "Make QR",
    button_gif: "Make QR GIF",
    qr: "Your animated QR",
    h3_topic_idea: "Idea",
    p_topic_idea: "",
    h3_topic_share: "Share",
    h3_topic_email: "Questions?",
    p_topic_telegram: "Message me on Telegram ",
    h3_topic_library: "Can I use it as a library?",
    p_topic_library_start: "Yes. The generator is powered by ",
    p_topic_library_end: ".",
    select_image: "Select image",
    loading: "Loading ...",
    button_random: "Random",
    button_template: "Template",
    button_upload: "Upload",
    button_giphy: "Animated GIF",
    button_download: "Download",
    giphy_search: "Find GIFs",
    giphy_search_placeholder: "GIF topic, e.g. cats, party, skate",
    giphy_missing_key: "Set NEXT_PUBLIC_GIPHY_API_KEY in .env to search GIFs",
    giphy_selected: "Selected animated GIF",
    template_selected: "Selected template",
    zone_drop: "Drag 'n' drop some files here, or click to select files",
  },
  ru: {
    title: "QRcode пиксель ART генератор",
    description:
      "Делай анимированные QR-гифки из GIPHY и своих ссылок.",
    h1: "Анимированные QR-гифки",
    p: "Преврати любую ссылку в живой QR-код на GIF-фоне.",
    h3_title: "Сделай QR живым",
    h4: "Вставь URL или текст",
    button: "Сделать QR",
    button_gif: "Сделать QR-гифку",
    qr: "Твоя QR-гифка",
    h3_topic_idea: "Идея",
    p_topic_idea: "Идея",
    h3_topic_share: "Расшарь в сеточки",
    h3_topic_email: "Есть вопросы?",
    p_topic_telegram: "Пиши в тележку ",
    h3_topic_library: "Можно использовать как библиотеку?",
    p_topic_library_start: "Да. Генератор основан на ",
    p_topic_library_end: ".",
    select_image: "Выбрать картинку",
    loading: "Загрузка ...",
    button_random: "Рандом",
    button_template: "По шаблону",
    button_upload: "Своя",
    button_giphy: "GIF-анимация",
    button_download: "Скачать",
    giphy_search: "Найти GIF",
    giphy_search_placeholder: "Тема GIF: коты, party, skate",
    giphy_missing_key: "Добавь NEXT_PUBLIC_GIPHY_API_KEY в .env для поиска GIF",
    giphy_selected: "Выбранная анимированная GIF",
    template_selected: "Выбранный шаблон",
    zone_drop: "Дропни картинку или выбери из файлов",
  },
};

export async function getServerSideProps(context) {
  const { locale } = context;

  const cdn_url = "https://qrart.fra1.cdn.digitaloceanspaces.com/templates/";

  const images = [
    "cat",
    "dog",
    "frog",
    "lol",
    "troll",
    "mona-lisa",
    "yoda",
    "hippo",
    "cat1",
    "bird",
    "cat2",
    "cat3",
  ];

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
  const giphyApiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || null;

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [giphyUrl, setGiphyUrl] = useState(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [url, setUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("qrcode.gif");
  const onGiphyChange = useCallback((nextGiphyUrl) => {
    setGiphyUrl(nextGiphyUrl);
  }, []);
  const clearGeneratedQr = useCallback(() => {
    setUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    setDownloadName("qrcode.gif");
  }, []);

  // radio buttons
  const [imgSource, setImgSource] = useState("giphy");
  const radioButtons = [
    { name: "giphy", title: texts.button_giphy },
    { name: "template", title: texts.button_template },
    { name: "random", title: texts.button_random },
    { name: "upload", title: texts.button_upload },
  ];
  const onCheckRadio = useCallback(
    (e) => {
      setImgSource((previousSource) => {
        if (previousSource !== e.target.name) {
          clearGeneratedQr();
        }
        return e.target.name;
      });
    },
    [clearGeneratedQr]
  );
  const canGenerate =
    (imgSource !== "giphy" || Boolean(giphyUrl)) &&
    (imgSource !== "upload" || Boolean(file));
  const generateButtonText = imgSource === "giphy" ? texts.button_gif : texts.button;

  // generate
  const sendData = useCallback(async () => {
    let data = input.current.value;

    if (!data) {
      data = "https://qrart.app/";
    }
    setLoading(true);
    const imageIndex = imgSource === "template" ? templateIndex : null;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        index: imageIndex,
        file: imgSource === "upload" ? file : null,
        giphyUrl: imgSource === "giphy" ? giphyUrl : null,
      }),
    });

    if (!res.ok) {
      setLoading(false);
      return;
    }

    const contentType = res.headers.get("content-type") || "";
    const blob = await res.blob();
    const nextUrl = URL.createObjectURL(blob);
    setLoading(false);
    input.current.value = data;
    setUrl((previousUrl) => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return nextUrl;
    });
    setDownloadName(contentType.includes("gif") ? "qrcode.gif" : "qrcode.jpg");

    setTimeout(() => {
      if (code.current) {
        code.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  }, [input, file, giphyUrl, imgSource, templateIndex]);

  useEffect(() => () => {
    if (url) {
      URL.revokeObjectURL(url);
    }
  }, [url]);

  return (
    <div className={styles.container}>
      <Meta title={texts.title} description={texts.description} />
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>{texts.h1}</h1>
        </header>

        <div className={styles.content}>
          <section className="message-left">
            <i className="nes-bcrikko"></i>
            <p className="nes-balloon nes-pointer from-left">{texts.p}</p>
          </section>

          <section className="hero-panel section">
            <h3 className="title">{texts.h3_title}</h3>
            <h4>{texts.h4}</h4>
            <input ref={input} type="text" className="nes-input" />
            <RadioGroup
              items={radioButtons}
              checkedItem={imgSource}
              onChange={onCheckRadio}
            />
            {imgSource === "template" && (
              <TemplatePicker
                items={galleryItems}
                texts={texts}
                onTemplateChange={setTemplateIndex}
              />
            )}
            {imgSource === "upload" && (
              <Dropzone message={texts.zone_drop} onFileChange={setFile} />
            )}
            {imgSource === "giphy" && (
              <GiphyPicker
                apiKey={giphyApiKey}
                texts={texts}
                onGifChange={onGiphyChange}
              />
            )}
            {loading ? (
              <div className="loader nes-badge animate__animated animate__pulse animate__infinite">
                <span className="is-error">{texts.loading}</span>
              </div>
            ) : (
              <button
                className="nes-btn is-primary"
                disabled={!canGenerate}
                onClick={sendData}
              >
                {generateButtonText}
              </button>
            )}
          </section>

          {url && (
            <section ref={code} className="nes-container with-title section">
              <h3 className="title">{texts.qr}</h3>
              <div className="code-container animate__animated animate__bounceInUp">
                <img className="qr" src={url} alt="QR" />

                <div>
                  <a
                    className="code-button nes-btn is-warning"
                    href={url}
                    download={downloadName}
                  >
                    {texts.button_download}
                  </a>
                </div>
              </div>
            </section>
          )}

          <section className="topic">
            <h3 id="email">
              <a href="#email">#</a>
              {texts.h3_topic_email}
            </h3>
            <p>
              {texts.p_topic_telegram}{" "}
              <a
                href="https://t.me/ykrutilin/"
                target="_blank"
                rel="noopener noreferrer"
              >
                @ykrutilin
              </a>
            </p>

            <h3 id="library">
              <a href="#library">#</a>
              {texts.h3_topic_library}
            </h3>
            <p>
              {texts.p_topic_library_start}
              <a
                href="https://github.com/krutilin/qrart-lib#readme"
                target="_blank"
                rel="noopener noreferrer"
              >
                qrart-lib
              </a>
              {texts.p_topic_library_end}
            </p>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
