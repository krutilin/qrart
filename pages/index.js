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
    input_placeholder: "https://example.com or text",
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
    h3_topic_giphy: "Where do GIFs come from?",
    p_topic_giphy: "GIF search and random GIFs are powered by GIPHY.",
    select_image: "Select image",
    loading: "Loading ...",
    loading_phrases: [
      "Brewing pixels...",
      "Mashing QR hops...",
      "Stirring GIF foam...",
      "Feeding the pixels...",
      "Polishing the squares...",
      "Warming up frames...",
      "Checking scan magic...",
      "Borrowing GIF energy...",
      "Went for a snack...",
      "Almost animated...",
      "Convincing QR to dance...",
      "Packing tiny frames...",
    ],
    button_random: "Random",
    button_template: "Template",
    button_upload: "Upload",
    button_giphy: "Animated GIF",
    button_download: "Download",
    giphy_search: "Find GIFs",
    giphy_search_placeholder: "GIF topic, e.g. cats, party, skate",
    giphy_missing_key: "Set NEXT_PUBLIC_GIPHY_API_KEY in .env to search GIFs",
    giphy_no_results: "No GIFs found. Try another search.",
    generation_error: "Could not generate this QR. Try another GIF.",
    upload_error: "Upload one GIF, JPG, or PNG up to 20 MB.",
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
    input_placeholder: "https://example.com или текст",
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
    h3_topic_giphy: "Откуда берутся GIF?",
    p_topic_giphy: "Поиск GIF и рандомные GIF работают на GIPHY.",
    select_image: "Выбрать картинку",
    loading: "Загрузка ...",
    loading_phrases: [
      "Варю пиво...",
      "Делаю затор...",
      "Мешаю пиксели...",
      "Грею кадры...",
      "Кручу GIF...",
      "Уговариваю QR...",
      "Проверяю магию...",
      "Собираю квадратики...",
      "Отошел покушать...",
      "Почти оживил...",
      "Причесываю пиксели...",
      "Пакую кадры...",
    ],
    button_random: "Рандом",
    button_template: "По шаблону",
    button_upload: "Своя",
    button_giphy: "GIF-анимация",
    button_download: "Скачать",
    giphy_search: "Найти GIF",
    giphy_search_placeholder: "Тема GIF: коты, party, skate",
    giphy_missing_key: "Добавь NEXT_PUBLIC_GIPHY_API_KEY в .env для поиска GIF",
    giphy_no_results: "GIF не найдены. Попробуй другой запрос.",
    generation_error: "Не получилось сгенерировать QR. Попробуй другую гифку.",
    upload_error: "Загрузи один GIF, JPG или PNG до 20 МБ.",
    giphy_selected: "Выбранная анимированная GIF",
    template_selected: "Выбранный шаблон",
    zone_drop: "Дропни картинку или выбери из файлов",
  },
};

const translitMap = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const getDownloadSource = (data) => {
  const value = data.trim();
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const path = decodeURIComponent(url.pathname).replace(/^\/|\/$/g, "");
      return `${url.hostname} ${path}`;
    }
  } catch (e) {
    return value;
  }

  return value;
};

const slugifyDownloadName = (data) => {
  const source = getDownloadSource(data);
  const slug = source
    .toLowerCase()
    .split("")
    .map((letter) => translitMap[letter] ?? letter)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64)
    .replace(/-+$/g, "");

  return slug || "qrcode";
};

const getDownloadName = (data, contentType) => {
  const extension = contentType.includes("gif") ? "gif" : "jpg";
  return `${slugifyDownloadName(data)}.${extension}`;
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
  const [giphy, setGiphy] = useState(null);
  const [templateIndex, setTemplateIndex] = useState(0);
  const [url, setUrl] = useState(null);
  const [generateError, setGenerateError] = useState(null);
  const [downloadName, setDownloadName] = useState("qrcode.gif");
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const onGiphyChange = useCallback((nextGif) => {
    setGiphy(nextGif);
  }, []);
  const clearGeneratedQr = useCallback(() => {
    setGenerateError(null);
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
        if (previousSource !== e.target.value) {
          clearGeneratedQr();
        }
        return e.target.value;
      });
    },
    [clearGeneratedQr]
  );
  const canGenerate =
    (imgSource !== "giphy" || Boolean(giphy?.urls?.length || giphy?.id)) &&
    (imgSource !== "upload" || Boolean(file));
  const generateButtonText = imgSource === "giphy" ? texts.button_gif : texts.button;
  const loadingPhrases = texts.loading_phrases || [texts.loading];
  const loadingButtonText = loadingPhrases[loadingPhraseIndex % loadingPhrases.length];

  useEffect(() => {
    if (!loading) {
      setLoadingPhraseIndex(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setLoadingPhraseIndex((index) => index + 1);
    }, 2200);

    return () => clearInterval(timer);
  }, [loading]);

  // generate
  const sendData = useCallback(async () => {
    let data = input.current.value;

    if (!data) {
      data = "https://qrart.app/";
    }
    setLoading(true);
    setGenerateError(null);
    const imageIndex = imgSource === "template" ? templateIndex : null;

    let res;
    try {
      res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data,
          index: imageIndex,
          file: imgSource === "upload" ? file : null,
          giphyId: imgSource === "giphy" ? giphy?.id : null,
          giphyUrls: imgSource === "giphy" ? giphy?.urls : null,
        }),
      });
    } catch (e) {
      setLoading(false);
      setGenerateError(texts.generation_error);
      return;
    }

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setLoading(false);
      setGenerateError(json?.error || texts.generation_error);
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
    setDownloadName(getDownloadName(data, contentType));

    setTimeout(() => {
      if (code.current) {
        code.current.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    }, 100);
  }, [input, file, giphy, imgSource, templateIndex, texts.generation_error]);

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
            <input
              ref={input}
              type="text"
              className="nes-input"
              placeholder={texts.input_placeholder}
              aria-label={texts.h4}
            />
            <RadioGroup
              items={radioButtons}
              groupName="image-source"
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
              <Dropzone
                message={texts.zone_drop}
                errorMessage={texts.upload_error}
                onFileChange={setFile}
              />
            )}
            {imgSource === "giphy" && (
              <GiphyPicker
                apiKey={giphyApiKey}
                texts={texts}
                onGifChange={onGiphyChange}
              />
            )}
            {loading ? (
              <button
                className="nes-btn is-error loading-button animate__animated animate__pulse animate__infinite"
                disabled
                type="button"
              >
                {loadingButtonText}
              </button>
            ) : (
              <button
                className="nes-btn is-primary"
                disabled={!canGenerate}
                onClick={sendData}
              >
                {generateButtonText}
              </button>
            )}
            {generateError && <p className="generate-error">{generateError}</p>}
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

            <h3 id="giphy">
              <a href="#giphy">#</a>
              {texts.h3_topic_giphy}
            </h3>
            <p>{texts.p_topic_giphy}</p>
            <a
              className="giphy-attribution"
              href="https://giphy.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Powered by GIPHY"
            >
              <img src="/giphy/powered-by-giphy.gif" alt="Powered by GIPHY" />
            </a>
          </section>
        </div>
        <Footer />
      </main>
    </div>
  );
}
