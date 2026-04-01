import { useEffect, useRef, useState } from 'react'
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

const AnimeCard = ({ anime, href }) => (
  <a className="anime-card" href={href}>
    <img src={anime.poster} alt={anime.title} loading="lazy" />
    <div className="anime-card__meta">
      <h3>{anime.title}</h3>
      <p>{anime.episode || anime.type || '-'}</p>
      <span>{anime.status_or_day || anime.status || '-'}</span>
    </div>
  </a>
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
  const animes = result.data?.animes || []
  return (
    <section className="panel">
      <h2>Ongoing Anime</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Belum ada data ongoing." />}
      <Pagination page={page} hasNext={Boolean(result.data?.pagination?.hasNext)} baseView="ongoing" />
    </section>
  )
}

const PopularPage = () => {
  const result = useFetch('popular', () => apiGet('/popular'))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const animes = result.data?.animes || []
  return (
    <section className="panel">
      <h2>Popular Anime</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Data popular kosong." />}
    </section>
  )
}

const MoviesPage = ({ query }) => {
  const page = getPage(query)
  const result = useFetch(`movies-${page}`, () => apiGet(`/movies?page=${page}`))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const animes = result.data?.animes || []
  const hasNext = result.data?.pagination?.hasNext ?? animes.length > 0
  return (
    <section className="panel">
      <h2>Anime Movies</h2>
      {animes.length ? <div className="grid">{animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div> : <EmptyState text="Data movie kosong." />}
      <Pagination page={page} hasNext={Boolean(hasNext)} baseView="movies" />
    </section>
  )
}

const SearchPage = ({ query }) => {
  const keyword = query.get('q') || ''
  const result = useFetch(`search-${keyword}`, () => (keyword ? apiGet(`/search/${encodeURIComponent(keyword)}`) : Promise.resolve({ animes: [] })))
  return (
    <section className="panel">
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
        (result.data?.animes || []).length ? (
          <div className="grid">{result.data.animes.map((anime) => <AnimeCard key={anime.slug} anime={anime} href={buildHash('detail', { slug: anime.slug })} />)}</div>
        ) : (
          <EmptyState text="Tidak ada hasil pencarian." />
        )
      ) : null}
    </section>
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
      <section className="panel">
        <h2>Anime A-Z</h2>
        <div className="letters">{LETTERS.map((item) => <a key={item} className={`letter ${item === selectedLetter ? 'letter--active' : ''}`} href={buildHash('animelist', { letter: item })}>{item}</a>)}</div>
        <LoadingState />
      </section>
    )
  }
  if (result.error) return <ErrorState message={result.error} />
  const animes = result.data?.animes || []
  const hasNext = result.data?.pagination?.hasNext ?? animes.length > 0
  return (
    <section className="panel">
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
    </section>
  )
}

const SchedulePage = () => {
  const result = useFetch('schedule', () => apiGet('/schedule'))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const schedule = result.data?.schedule || {}
  return (
    <section className="panel">
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
    </section>
  )
}

const DetailPage = ({ slug }) => {
  const decoded = decodeURIComponent(slug || '')
  const result = useFetch(`detail-${decoded}`, () => apiGet(`/detail/${decoded}`))
  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const data = result.data || {}
  return (
    <section className="panel">
      <a className="btn back-btn" href={buildHash('home')}>
        ← Kembali
      </a>
      <div className="detail-header">
        <img src={data.poster} alt={data.title} />
        <div>
          <h2>{data.title}</h2>
          <p>{data.synopsis}</p>
          <div className="tags">
            <span>⭐ {data.score || '-'}</span>
            <span>{data.status || '-'}</span>
            <span>{data.type || '-'}</span>
            <span>{data.duration || '-'}</span>
            <span>{data.aired || '-'}</span>
            <span>{data.author || '-'}</span>
          </div>
          <div className="tags">
            {(data.genres || []).map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
        </div>
      </div>
      <h3>Daftar Episode</h3>
      {(data.episodes || []).length ? (
        <div className="episodes">
          {data.episodes.map((episode) => (
            <a key={episode.slug} className="episode-item" href={buildHash('episode', { slug: episode.slug })}>
              {episode.title}
            </a>
          ))}
        </div>
      ) : (
        <EmptyState text="Belum ada daftar episode." />
      )}
    </section>
  )
}

const EpisodePage = ({ slug }) => {
  const decoded = decodeURIComponent(slug || '')
  const result = useFetch(`episode-${decoded}`, () => apiGet(`/episode/${decoded}`))
  const [selected, setSelected] = useState(0)

  if (result.loading) return <LoadingState />
  if (result.error) return <ErrorState message={result.error} />
  const streams = result.data?.streams || []
  const active = streams[selected]
  const canUseVideo = active && /\.(mp4|webm|ogg)(\?|$)/i.test(active.url)
  return (
    <section className="panel">
      <h2>{result.data?.title || 'Episode'}</h2>
      {streams.length ? (
        <>
          <div className="player-wrap">
            {active ? (
              canUseVideo ? (
                <video src={active.url} controls playsInline className="video-player" />
              ) : (
                <iframe title={active.name} src={active.url} className="frame-player" allowFullScreen />
              )
            ) : null}
          </div>
          <div className="stream-list">
            {streams.map((stream, index) => (
              <button key={stream.name} className={`stream-btn ${index === selected ? 'stream-btn--active' : ''}`} onClick={() => setSelected(index)}>
                {stream.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <EmptyState text="Link stream tidak tersedia." />
      )}
    </section>
  )
}

const HomePage = () => {
  const popular = useFetch('home-popular', () => apiGet('/popular'))
  const ongoing = useFetch('home-ongoing', () => apiGet('/ongoing?page=1'))
  const schedule = useFetch('home-schedule', () => apiGet('/schedule'))

  return (
    <section className="home">
      <div className="hero">
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
      </div>

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
            {(popular.data?.animes || []).slice(0, 6).map((anime) => (
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
            {(ongoing.data?.animes || []).slice(0, 6).map((anime) => (
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
    </section>
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
      <main>{content}</main>
      <footer className="footer">Streaming UI by Animz • API Animasu</footer>
    </div>
  )
}

export default App
