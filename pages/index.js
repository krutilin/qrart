import React, { useState, useCallback, useRef } from "react";
import ImageGallery from "react-image-gallery";
import styles from "../styles/Home.module.css";
import Meta from "../components/Meta";
import RadioGroup from "../components/RadioGroup";
import Dropzone from "../components/Dropzone";
import Footer from "../components/Footer";

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
    select_image: "Select image",
    loading: "Loading ...",
    button_random: "Random",
    button_template: "Template",
    button_upload: "Upload",
    button_download: "Download",
    zone_drop: "Drag 'n' drop some files here, or click to select files"
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
    select_image: "Выбрать картинку",
    loading: "Загрузка ...",
    button_random: "Рандом",
    button_template: "По шаблону",
    button_upload: "Своя",
    button_download: "Скачать",
    zone_drop: "Дропни картинку или выбери из файлов"
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
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);

  // radio buttons
  const [imgSource, setImgSource] = useState("random");
  const radioButtons = [
    { name: "random", title: texts.button_random },
    { name: "template", title: texts.button_template },
    { name: "upload", title: texts.button_upload },
  ];
  const onCheckRadio = useCallback((e) => {
    setImgSource(e.target.name);
  }, []);

  // generate
  const sendData = useCallback(async () => {
    let data = input.current.value;

    if (!data) {
      data = "https://qrart.app/";
    }
    setLoading(true);
    const imageIndex =
      imgSource === "template" ? gallery.current?.getCurrentIndex() : null;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data, index: imageIndex, file: file }),
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
  }, [input, gallery, file, imgSource]);

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

          <section className="nes-container with-title section">
            <h3 className="title">{texts.h3_title}</h3>
            <h4>{texts.h4}</h4>
            <input ref={input} type="text" className="nes-input" />
            <RadioGroup
              items={radioButtons}
              checkedItem={imgSource}
              onChange={onCheckRadio}
            />
            {imgSource === "template" && (
              <ImageGallery
                ref={gallery}
                additionalClass="img-gallery animate__animated animate__bounceInDown"
                items={galleryItems}
                infinite={false}
                showPlayButton={false}
                showFullscreenButton={false}
              />
            )}
            {imgSource === "upload" && (
              <Dropzone
                message={texts.zone_drop}
                onFileChange={setFile}
              />
            )}
            {loading ? (
              <div className="loader nes-badge animate__animated animate__pulse animate__infinite">
                <span className="is-error">{texts.loading}</span>
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
              {texts.p_topic_email}{" "}
              <a href="mailto:support@qrart.app">support@qrart.app</a>
            </p>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
