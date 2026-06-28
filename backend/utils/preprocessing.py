import re
from Sastrawi.Stemmer.StemmerFactory import StemmerFactory
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory

# Stemmer
stemmer = StemmerFactory().create_stemmer()

# Stopword
stop_words = set(
    StopWordRemoverFactory().get_stop_words()
)


def preprocess(text: str):

    if text is None:
        return []

    text = str(text).lower()

    # hapus angka
    text = re.sub(r"\d+", " ", text)

    # hapus tanda baca
    text = re.sub(r"[^\w\s]", " ", text)

    # hapus underscore
    text = text.replace("_", " ")

    # hapus spasi ganda
    text = re.sub(r"\s+", " ", text).strip()

    tokens = text.split()

    hasil = []

    for token in tokens:

        if len(token) <= 2:
            continue

        if token in stop_words:
            continue

        hasil.append(
            stemmer.stem(token)
        )

    return hasil