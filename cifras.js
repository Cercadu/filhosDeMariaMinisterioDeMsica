// cifras.js - Gerenciamento de transposição e formatação de cifras

// Notas musicais para transposição
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Transposição de acordes
function transposeChord(chord, semitones) {
    // Padrão para extrair a nota base e possíveis modificadores
    const chordPattern = /^([A-G][#b]?)(.*)$/;
    const match = chord.match(chordPattern);

    if (!match) return chord; // Não é um acorde válido

    const [, note, suffix] = match;

    // Encontrar o índice da nota no array
    let noteIndex;
    if (note.includes('b')) {
        noteIndex = NOTES_FLAT.indexOf(note);
        if (noteIndex === -1) return chord;

        // Calcular a nova posição
        const newIndex = (noteIndex + semitones + 12) % 12;
        return NOTES_FLAT[newIndex] + suffix;
    } else {
        noteIndex = NOTES.indexOf(note);
        if (noteIndex === -1) return chord;

        // Calcular a nova posição
        const newIndex = (noteIndex + semitones + 12) % 12;
        return NOTES[newIndex] + suffix;
    }
}

// Processa uma linha de texto para transposição
function transposeLine(line, semitones) {
    if (!line) return '';

    // Padrão para encontrar acordes no texto
    const chordPattern = /<b>([A-G][#b]?[^<]*)<\/b>/g;

    // Substituir cada acorde pela versão transposta
    return line.replace(chordPattern, (match, chord) => {
        // Dividir o acorde em partes se contiver espaços (múltiplos acordes)
        if (chord.includes(' ')) {
            const chords = chord.split(' ');
            const transposedChords = chords.map(c => transposeChord(c, semitones));
            return '<b>' + transposedChords.join(' ') + '</b>';
        }
        return '<b>' + transposeChord(chord, semitones) + '</b>';
    });
}

// Transpõe o conteúdo completo de uma cifra
function transposeContent(content, semitones) {
    if (!content) return '';

    const lines = content.split('\n');
    const transposedLines = lines.map(line => transposeLine(line, semitones));
    return transposedLines.join('\n');
}

// Formata a cifra para exibição com seções destacadas
function formatSongContent(content) {
    if (!content) return '';

    // Identificar seções entre colchetes como [Intro], [Verso], etc.
    const sectionPattern = /\[(.*?)\]/g;

    let formattedContent = content;
    let sectionCount = 0;

    // Substituir os marcadores de seção por divs com estilo
    formattedContent = formattedContent.replace(sectionPattern, (match, sectionName) => {
        sectionCount++;
        return `<div class="section-${sectionCount}"><div class="section-title">${match}</div>`;
    });

    // Fechar as divs de seção
    for (let i = 0; i < sectionCount; i++) {
        formattedContent += '</div>';
    }

    // Garantir que os acordes tenham o estilo correto
    formattedContent = formattedContent.replace(/<b>([^<]+)<\/b>/g, '<span class="chord">$1</span>');

    return formattedContent;
}

// Detecta o tom principal da música a partir do conteúdo
function detectSongKey(content) {
    if (!content) return { key: '', capo: 0 };

    // Procurar por "tom: X" ou "Capotraste na X casa"
    const keyPattern = /tom:\s*([A-G][#b]?)/i;
    const capoPattern = /capotraste\s+na\s+(\d+)ª?\s+casa/i;

    const keyMatch = content.match(keyPattern);
    const capoMatch = content.match(capoPattern);

    const key = keyMatch ? keyMatch[1] : '';
    const capo = capoMatch ? parseInt(capoMatch[1]) : 0;

    return { key, capo };
}

// Gera URL para o Cifra Club com base no título da música
function generateCifraClubUrl(title, artist) {
    if (!title) return 'https://www.cifraclub.com.br';

    // Formatação da URL
    let urlArtist = '';
    if (artist) {
        urlArtist = artist
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
    }

    // Formatar título para URL
    const formattedTitle = title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-');

    return urlArtist
        ? `https://www.cifraclub.com.br/${urlArtist}/${formattedTitle}`
        : `https://www.cifraclub.com.br/${formattedTitle}`;
}

// Funções para auto-rolagem
let autoScrollInterval = null;
let scrollSpeed = 5;

function startAutoScroll(contentEl) {
    stopAutoScroll();

    // A velocidade é inversamente proporcional ao valor:
    // maior valor = rolagem mais lenta
    const scrollDelay = (11 - scrollSpeed) * 50;

    autoScrollInterval = setInterval(() => {
        contentEl.scrollTop += 1;

        // Parar quando chegar ao final
        if (contentEl.scrollTop >= (contentEl.scrollHeight - contentEl.clientHeight)) {
            stopAutoScroll();
            document.getElementById('autoscrollSwitch').checked = false;
        }
    }, scrollDelay);
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Exportar as funções para uso global
window.CifrasJS = {
    transposeChord,
    transposeLine,
    transposeContent,
    formatSongContent,
    detectSongKey,
    generateCifraClubUrl,
    startAutoScroll,
    stopAutoScroll
};
