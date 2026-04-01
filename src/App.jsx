import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import './App.css'

const API_BASE = 'https://www.sankavollerei.com/anime/animasu'
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const DAY_ORDER = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu']

const toTitle = (value = '') =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value

const getPage = (query) => {
  const number = Number(query.get('page') || 1)
  return Number.isFinite(number) && number > 0 ? number : 1
}

const getRoute = () => {
  const hash = window.location.hash || '#/'
  const [pathRaw, search = ''] = hash.replace(/^#/, '').split('?')
  const path = pathRaw.replace(/^\/+/, '')
  const parts = path ? path.split('/').filter(Boolean) : []
  const view = parts[0] || 'home'
  const slug = parts.slice(1).join('/')
  return { view, slug, query: new URLSearchParams(search) }
}

const buildHash = (view, params = {}) => {
  const path = view === 'home' ? '/' : `/${view}${params.slug ? `/${params.slug}` : ''}`
  const query = new URLSearchParams()
  if (params.page && params.page > 1) query.set('page', String(params.page))
  if (params.q) query.set('q', params.q)
  if (params.letter) query.set('letter', params.letter)
  const queryText = query.toString()
  return `#${path}${queryText ? `?${queryText}` : ''}`
}

const apiGet = async (path) => {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) throw new Error('Gagal ambil data dari API')
  return response.json()
}

const ensureArray = (value) => (Array.isArray(value) ? value : [])

const getAnimeList = (data) => ensureArray(data?.animes || data?.data?.animes || data?.result?.animes)

const getPagination = (data) => data?.pagination || data?.data?.pagination || data?.result?.pagination || {}

const getDetailData = (data) => data?.detail || data?.data?.detail || data || {}

const getEpisodeData = (data) => data?.episode || data?.data?.episode || data || {}

const getGenreLabel = (genre) => {
  if (typeof genre === 'string') return genre
  if (genre && typeof genre === 'object') return genre.name || genre.title || ''
  return ''
}

const extractIframeSrc = (value = '') => {
  if (!value) return ''
  if (/<iframe/i.test(value)) {
    const match = value.match(/src=["']([^"']+)["']/i)
    return match?.[1] || ''
  }
  return value
}

const getStreamType = (rawUrl = '') => {
  const value = String(rawUrl || '').trim()
  if (!value) return 'unknown'
  if (/<iframe/i.test(value)) return 'iframe'
  if (/(\.mp4|\.webm|\.ogg)(\?|$)/i.test(value)) return 'video'
  if (/\.m3u8(\?|$)/i.test(value)) return 'hls'
  if (/youtube\.com\/embed|player\.vimeo\.com|streamtape|dood|filemoon|ok\.ru|mp4upload|gdriveplayer/i.test(value)) return 'iframe'
  return 'iframe'
}

const clampIndex = (index, length) => {
  if (!length) return 0
  return Math.max(0, Math.min(index, length - 1))
}

const useFetch = (key, loader) => {
  const [state, setState] = useState({ key, loading: true, error: '', data: null })
  const loaderRef = useRef(loader)

  useEffect(() => {
    loaderRef.current = loader
  }, [loader])

  useEffect(() => {
    let active = true
    loaderRef.current()
      .then((data) => {
        if (active) setState({ key, loading: false, error: '', data })
      })
      .catch((error) => {
        if (active) setState({ key, loading: false, error: error.message, data: null })
      })
    return () => {
      active = false
    }
  }, [key])

  if (state.key !== key) return { loading: true, error: '', data: null }
  return { loading: state.loading, error: state.error, data: state.data }
}

const LoadingState = () => (
  <div className="loading-state">
    <div className="pulse pulse-lg" />
    <div className="pulse" />
    <div className="pulse" />
  </div>
)

const ErrorState = ({ message }) => (
  <div className="error-state">{message || 'Terjadi kendala, coba lagi ya.'}</div>
)

const EmptyState = ({ text }) => <div className="empty-state">{text}</div>

const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
}

const MotionSection = motion.section
const MotionDiv = motion.div
const MotionLink = motion.a

const AnimeCard = ({ anime, href }) => (
  <MotionLink className="anime-card" href={href} whileHover={{ y: -6, scale: 1.01 }} transition={{ duration: 0.22 }}>
    <img src={anime.poster} alt={anime.title} loading="lazy" />
    <div className="anime-card__meta">
      <h3>{anime.title}</h3>
      <p>{anime.episode || anime.type || '-'}</p>
      <span>{anime.status_or_day || anime.status || '-'}</span>
    </div>
  </MotionLink>
)

const Pagination = ({ page, hasNext, baseView, extra = {} }) => (
  <div className="pagination">
    <a className={`btn ${page <= 1 ? 'btn--disabled' : ''}`} href={buildHash(baseView, { ...extra, page: page - 1 })}>
      Prev
    </a>
    <span>Halaman {page}</span>
    <a className={`btn ${!hasNext ? 'btn--disabled' : ''}`} href={buildHash(baseView, { ...extra, page: page + 1 })}>
      Next
    </a>
  </div>
)

const OngoingPage = ({ query }) => {
  const page = getPage(query)
  const result = useFetch(`ongoing-${page}`, () => apiGet(`/ongoing?page=${page}`))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const animes = getAnimeList(result.data)
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Ongoing Anime</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Belum ada data ongoing." />}
      <Pagination page={page} hasNext={Boolean(getPagination(result.data)?.hasNext)} baseView="ongoing" />
    </MotionSection>
  )
}

const PopularPage = () => {
  const result = useFetch('popular', () => apiGet('/popular'))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const animes = getAnimeList(result.data)
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Popular Anime</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Data popular kosong." />}
    </MotionSection>
  )
}

const MoviesPage = ({ query }) => {
  const page = getPage(query)
  const result = useFetch(`movies-${page}`, () => apiGet(`/movies?page=${page}`))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const animes = getAnimeList(result.data)
  const hasNext = getPagination(result.data)?.hasNext ?? animes.length > 0
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Anime Movies</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Data movie kosong." />}
      <Pagination page={page} hasNext={Boolean(hasNext)} baseView="movies" />
    </MotionSection>
  )
}

const SearchPage = ({ query }) => {
  const keyword = query.get('q') || ''
  const result = useFetch(`search-${keyword}`, () => (keyword ? apiGet(`/search/${encodeURIComponent(keyword)}`) : Promise.resolve({ animes: [] })))
  const animes = getAnimeList(result.data)
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Pencarian Anime</h2>
      <form action="#/search" className="search-form">
        <input type="text" name="q" defaultValue={keyword} placeholder="Cari judul anime..." />
        <button className="btn" type="submit">
          Cari
        </button>
      </form>
      {!keyword ? <EmptyState text="Masukkan kata kunci untuk mencari anime." /> : null}
      {keyword && result.loading ? <LoadingState /> : null}
      {keyword && result.error ? <ErrorState message={result.error} /> : null}
      {keyword && !result.loading && !result.error ? (
        animes.length ? (
          <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div>
        ) : (
          <EmptyState text="Tidak ada hasil pencarian." />
        )
      ) : null}
    </MotionSection>
  )
}

const AnimeListPage = ({ query }) => {
  const letter = (query.get('letter') || 'A').toUpperCase()
  const selectedLetter = LETTERS.includes(letter) ? letter : 'A'
  const page = getPage(query)
  const result = useFetch(`animelist-${selectedLetter}-${page}`, () =>
    apiGet(`/animelist?letter=${selectedLetter}&page=${page}`),
  )
  if (result.loading) {
    return (
      <MotionSection className="panel" {...fadeInUp}>
        <h2>Anime A-Z</h2>
        <div className="letters">{LETTERS.map((item) => <a key={item} className={`letter ${item === selectedLetter ? 'letter--active' : ''}`} href={buildHash('animelist', { letter: item })}>{item}</a>)}</div>
        <LoadingState />
      </MotionSection>
    )
  }
  if (result.error) return <ErrorState message={result.error} />
  const animes = getAnimeList(result.data)
  const hasNext = getPagination(result.data)?.hasNext ?? animes.length > 0
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Anime A-Z</h2>
      <div className="letters">
        {LETTERS.map((item) => (
          <a key={item} className={`letter ${item === selectedLetter ? 'letter--active' : ''}`} href={buildHash('animelist', { letter: item })}>
            {item}
          </a>
        ))}
      </div>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text={`Belum ada anime untuk huruf ${selectedLetter}.`} />}
      <Pagination page={page} hasNext={Boolean(hasNext)} baseView="animelist" extra={{ letter: selectedLetter }} />
    </MotionSection>
  )
}

const SchedulePage = () => {
  const result = useFetch('schedule', () => apiGet('/schedule'))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const schedule = result.data?.schedule || {}
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>Jadwal Rilis Mingguan</h2>
      <div className="schedule-wrap">
        {DAY_ORDER.map((day) => (
          <article className="day-card" key={day}>
            <h3>{toTitle(day)}</h3>
            {(schedule[day] || []).length ? (
              <ul>
                {schedule[day].map((anime) => (
                  <li key={anime.slug}>
                    <a href={buildHash('detail', { slug: anime.slug })}>{anime.title}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Tidak ada rilis.</p>
            )}
          </article>
        ))}
      </div>
    </MotionSection>
  )
}

const DetailPage = ({ slug }) => {
  const decoded = decodeURIComponent(slug || '')
  const result = useFetch(`detail-${decoded}`, () => apiGet(`/detail/${decoded}`))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const data = getDetailData(result.data)
  const episodes = ensureArray(data.episodes)
  const genres = ensureArray(data.genres).map(getGenreLabel).filter(Boolean)
  const score = data.score || data.rating || '-'
  return (
    <motion.section className="panel" {...fadeInUp}>
      <a className="btn back-btn" href={buildHash('home')}>
        ← Kembali
      </a>
      <div className="detail-header">
        <img src={data.poster} alt={data.title || 'Poster anime'} loading="lazy" />
        <div>
          <h2>{data.title || 'Detail Anime'}</h2>
          <p>{data.synopsis}</p>
          <div className="tags">
            <span>⭐ {score}</span>
            <span>{data.status || '-'}</span>
            <span>{data.type || '-'}</span>
            <span>{data.duration || '-'}</span>
            <span>{data.aired || '-'}</span>
            <span>{data.author || '-'}</span>
          </div>
          {genres.length ? <div className="tags">{genres.map((genre) => <span key={genre}>{genre}</span>)}</div> : null}
        </div>
      </div>
      <h3>Daftar Episode</h3>
      {episodes.length ? (
        <div className="episodes">
          {episodes.map((episode) => (
            <a key={episode.slug} className="episode-item" href={buildHash('episode', { slug: episode.slug })}>
              {episode.title}
            </a>
          ))}
        </div>
      ) : (
        <EmptyState text="Belum ada daftar episode." />
      )}
    </motion.section>
  )
}

const EpisodePage = ({ slug }) => {
  const decoded = decodeURIComponent(slug || '')
  const result = useFetch(`episode-${decoded}`, () => apiGet(`/episode/${decoded}`))
  const [selected, setSelected] = useState(0)
  const videoRef = useRef(null)

  const data = getEpisodeData(result.data)
  const streams = ensureArray(data.streams)
  const safeSelected = clampIndex(selected, streams.length)
  const active = streams[safeSelected]
  const activeUrl = active?.url || ''
  const streamType = getStreamType(activeUrl)
  const iframeSrc = extractIframeSrc(activeUrl)
  const videoSrc = streamType === 'video' ? iframeSrc : ''

  useEffect(() => {
    if (selected !== safeSelected) setSelected(safeSelected)
  }, [selected, safeSelected])

  useEffect(() => {
    if (streamType !== 'hls' || !iframeSrc || !videoRef.current) return undefined
    let destroyed = false
    let hlsInstance
    if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = iframeSrc
      return undefined
    }
    import('hls.js').then(({ default: Hls }) => {
      if (destroyed || !videoRef.current || !Hls.isSupported()) return
      hlsInstance = new Hls()
      hlsInstance.loadSource(iframeSrc)
      hlsInstance.attachMedia(videoRef.current)
    })
    return () => {
      destroyed = true
      hlsInstance?.destroy()
    }
  }, [streamType, iframeSrc, safeSelected])

  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  return (
    <MotionSection className="panel" {...fadeInUp}>
      <h2>{data?.title || result.data?.title || 'Episode'}</h2>
      {streams.length ? (
        <>
          <div className="player-wrap">
            {active ? (
              streamType === 'hls' ? (
                <video key={`hls-${safeSelected}`} ref={videoRef} controls playsInline className="video-player" />
              ) : videoSrc ? (
                <video key={`video-${safeSelected}`} ref={videoRef} src={videoSrc} controls playsInline className="video-player" />
              ) : streamType === 'iframe' && iframeSrc ? (
                <iframe title={active.name} src={iframeSrc} className="frame-player" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <div className="empty-state">
                  Stream tidak dapat diputar langsung. <a href={activeUrl} target="_blank" rel="noreferrer">Buka sumber</a>
                </div>
              )
            ) : null}
          </div>
          <div className="stream-list">
            {streams.map((stream, index) => (
              <button key={`${stream.name}-${index}`} className={`stream-btn ${index === safeSelected ? 'stream-btn--active' : ''}`} onClick={() => setSelected(clampIndex(index, streams.length))}>
                {stream.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <EmptyState text="Link stream tidak tersedia." />
      )}
    </MotionSection>
  )
}

const HomePage = () => {
  const popular = useFetch('home-popular', () => apiGet('/popular'))
  const ongoing = useFetch('home-ongoing', () => apiGet('/ongoing?page=1'))
  const schedule = useFetch('home-schedule', () => apiGet('/schedule'))

  return (
    <MotionSection className="home" {...fadeInUp}>
      <MotionDiv className="hero" initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="hero__shine" />
        <h1>Animz Streaming</h1>
        <p>
          Platform anime modern dengan UI/UX elegan, animasi halus, pencarian cepat, dan
          navigasi episode lengkap.
        </p>
        <div className="hero-actions">
          <a className="btn" href={buildHash('ongoing')}>
            Lihat Ongoing
          </a>
          <a className="btn btn--ghost" href={buildHash('search')}>
            Cari Anime
          </a>
        </div>
      </MotionDiv>

      <section className="panel">
        <div className="panel-head">
          <h2>Popular Hari Ini</h2>
          <a href={buildHash('popular')}>Lihat semua</a>
        </div>
        {popular.loading ? (
          <LoadingState />
        ) : popular.error ? (
          <ErrorState message={popular.error} />
        ) : (
          <div className="grid">
            {getAnimeList(popular.data).slice(0, 6).map((anime) => (
              <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Ongoing Terbaru</h2>
          <a href={buildHash('ongoing')}>Buka halaman</a>
        </div>
        {ongoing.loading ? (
          <LoadingState />
        ) : ongoing.error ? (
          <ErrorState message={ongoing.error} />
        ) : (
          <div className="grid">
            {getAnimeList(ongoing.data).slice(0, 6).map((anime) => (
              <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Jadwal Cepat</h2>
          <a href={buildHash('schedule')}>Lihat lengkap</a>
        </div>
        {schedule.loading ? (
          <LoadingState />
        ) : schedule.error ? (
          <ErrorState message={schedule.error} />
        ) : (
          <div className="schedule-mini">
            {DAY_ORDER.map((day) => (
              <div key={day} className="schedule-mini__item">
                <h3>{toTitle(day)}</h3>
                <p>{(schedule.data?.schedule?.[day] || []).length} anime</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </MotionSection>
  )
}

function App() {
  const [route, setRoute] = useState(() => getRoute())

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute())
    window.addEventListener('hashchange', onHashChange)
    if (!window.location.hash) {
      window.location.hash = '#/'
    } else {
      onHashChange()
    }
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const activeRoute = route

  let content = <HomePage />
  if (activeRoute.view === 'ongoing') content = <OngoingPage query={activeRoute.query} />
  if (activeRoute.view === 'popular') content = <PopularPage />
  if (activeRoute.view === 'schedule') content = <SchedulePage />
  if (activeRoute.view === 'search') content = <SearchPage query={activeRoute.query} />
  if (activeRoute.view === 'animelist') content = <AnimeListPage query={activeRoute.query} />
  if (activeRoute.view === 'movies') content = <MoviesPage query={activeRoute.query} />
  if (activeRoute.view === 'detail') content = <DetailPage slug={activeRoute.slug} />
  if (activeRoute.view === 'episode') content = <EpisodePage key={activeRoute.slug} slug={activeRoute.slug} />
  if (!['home', 'ongoing', 'popular', 'schedule', 'search', 'animelist', 'movies', 'detail', 'episode'].includes(activeRoute.view)) {
    content = <HomePage />
  }

  const navItems = [
    ['home', 'Home'],
    ['ongoing', 'Ongoing'],
    ['popular', 'Popular'],
    ['schedule', 'Schedule'],
    ['search', 'Search'],
    ['movies', 'Movies'],
    ['animelist', 'A-Z'],
  ]

  return (
    <div className="app-shell">
      <header className="header">
        <a href={buildHash('home')} className="brand">
          ✦ Animz
        </a>
        <nav>
          {navItems.map(([key, label]) => (
            <a key={key} href={buildHash(key)} className={activeRoute.view === key ? 'nav-link nav-link--active' : 'nav-link'}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <main>
        <AnimatePresence mode="wait">
          <MotionDiv key={`${activeRoute.view}-${activeRoute.slug}-${activeRoute.query.toString()}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            {content}
          </MotionDiv>
        </AnimatePresence>
      </main>
      <footer className="footer">Streaming UI by Animz • API Animasu</footer>
    </div>
  )
}

export default App
