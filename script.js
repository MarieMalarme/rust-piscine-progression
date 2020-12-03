// Try push force
const root = document.documentElement
const body = document.querySelector('body')
const url_prefix = `https://api.github.com/repos/augusto-mantilla/rust-exercises`
const svg_url = 'http://www.w3.org/2000/svg'
const events = ['mouseover', 'mouseleave']
const goal_amount = 90
const hour = 3600000
const padding = 30

const settings_colors = {
  green: 'hsl(136, 100%, 65%)',
  red: 'hsl(0, 100%, 65%)',
}

const stats_types = {
  done: 'green',
  review: 'grey',
  left: 'red',
  goal: 'dark_grey',
}

const init = {
  method: 'GET',
  mode: 'cors',
  cache: 'default',
}

const groupBy = (items, key) => {
  return items.reduce(
    (result, item) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item.exercises],
    }),
    {},
  )
}

const to_dash_case = (string) => {
  return string
    .split(/(?=[A-Z])/)
    .join('-')
    .toLowerCase()
}

const aggregate_amounts = (exercises) =>
  exercises.reduce((acc, { amount }) => (acc += amount), 0)

const draw_elem = (type, svg, attrs) => {
  const elem = document.createElementNS(svg_url, type)
  Object.entries(attrs).forEach(([key, value]) => {
    elem.setAttributeNS(null, to_dash_case(key), value)
  })
  svg.append(elem)
  return elem
}

const display_stats = (done_amount, review_amount, exercises_per_date) => {
  const left_amount = goal_amount - done_amount - review_amount

  const exercises_datas = [
    { type: 'done', amount: done_amount, color: 'green' },
    { type: 'review', amount: review_amount, color: 'grey' },
    { type: 'left', amount: left_amount, color: 'red' },
  ]

  exercises_datas.map(({ type }, i) => {
    const stat = document.querySelector(`#${type} .data`)
    stat.textContent = exercises_datas[i].amount
  })

  display_exercises_stats_graph(exercises_datas)
  display_exercises_graph(exercises_per_date)
}

const display_exercises_stats_graph = (exercises_datas) => {
  const svg = document.querySelector('#exercises_stats #graph')

  exercises_datas.map((data, index) => {
    const { width } = svg.getBoundingClientRect()
    const total_exercises_amounts = aggregate_amounts(exercises_datas)
    const prev_exercises = exercises_datas.filter((elem, i) => i < index)
    const prev_amounts = aggregate_amounts(prev_exercises)
    const x1 = (width * prev_amounts) / total_exercises_amounts
    const x2 = (width * data.amount) / total_exercises_amounts + x1
    const percentage = (data.amount / total_exercises_amounts) * 100

    draw_elem('line', svg, {
      id: `line-exercises-${data.type}`,
      x1,
      x2,
      y1: 30,
      y2: 30,
      stroke: `var(--${data.color})`,
      strokeWidth: 5,
    })

    const text = draw_elem('text', svg, {
      id: `percentage-exercises-${data.type}`,
      x: x1,
      y: 10,
      fill: `var(--${data.color})`,
      fontSize: '13px',
    })
    text.textContent = `${Math.round(percentage)}%`
  })
}

const display_exercises_graph = (exercises_per_date) => {
  const svg = document.querySelector('#exercises_graph')
  const width = svg.getBoundingClientRect().width - padding * 2
  const height = 400
  let prev = { x: padding, y: padding }

  exercises_per_date.forEach((data, i) => {
    const x = (width / (exercises_per_date.length - 1)) * i + padding || padding
    const y = height - (height / 110) * data.exercises

    // draw date caption
    const date_text = draw_elem('text', svg, {
      x,
      y: 400,
      fill: 'var(--grey)',
      fontSize: '13px',
      textAnchor: 'middle',
    })
    date_text.textContent = data.date

    // draw linking line
    draw_elem('line', svg, {
      x1: x,
      x2: prev.x + 5,
      y1: y,
      y2: i ? prev.y : y,
      stroke: 'var(--green)',
      strokeWidth: 1,
    })

    // draw value number
    const value_text = draw_elem('text', svg, {
      id: `data-text-value-${i}`,
      x,
      y: y - 50,
      fill: 'var(--green)',
      svg,
      fontSize: '50px',
      textAnchor: 'middle',
    })
    value_text.textContent = data.exercises
    value_text.style.opacity =
      i === exercises_per_date.length - 1 || i === 0 ? 1 : 0

    // draw circle
    const date_circle = draw_elem('circle', svg, {
      id: `data-point-${i}`,
      cx: x,
      cy: y,
      fill: 'var(--green)',
      r: 5,
      textAnchor: 'middle',
    })

    // display number when hovering a circle
    if (i !== 0 && i !== exercises_per_date.length - 1) {
      events.map((event) => {
        date_circle.addEventListener(event, (e) => {
          const id = document
            .querySelector(`#${e.target.id}`)
            .id.replace('data-point-', '')
          const target = document.querySelector(`#data-text-value-${id}`)
          target.style.opacity = event === 'mouseover' ? 1 : 0
        })
      })
    }

    prev = { x, y }
  })
}

const populate_html = () => {
  Object.entries(settings_colors).map(([color, default_value]) => {
    root.style.setProperty(`--${color}`, localStorage[color] || default_value)
    const range_input = document.querySelector(`#range-${color}`)
    range_input.addEventListener('input', (e) => {
      root.style.setProperty(`--${color}`, `hsl(${e.target.value}, 100%, 65%)`)
    })
    range_input.addEventListener('mouseup', (e) => {
      localStorage[color] = `hsl(${e.target.value}, 100%, 65%)`
    })
  })

  const exercises_stats_datas = document.querySelector('#datas')
  Object.entries(stats_types).forEach(([type, color], i) => {
    const stat = document.createElement('div')
    stat.id = type
    stat.className = `stat ${color}`
    const data = document.createElement('div')
    data.className = 'data'
    data.textContent = type === 'goal' ? '90' : '-'
    const label = document.createElement('div')
    label.className = 'label'
    label.textContent = type
    stat.append(data, label)
    exercises_stats_datas.append(stat)
  })
}

const get_commits = async () => {
  const commits = await fetch_data(`${url_prefix}/commits`)
  return commits.map(({ commit, author, tree }) => ({
    author: author.login,
    message: commit.message,
    date: commit.author.date.slice(5, 10).split('-').reverse().join('-'),
    sha: commit.tree.sha,
  }))
}

const display_commits = async (commits) => {
  commits.map(({ author, message, date }) => {
    const container = document.createElement('div')
    container.className = 'commit'

    create_commit_elem('author', author, container)
    create_commit_elem('message', message, container)
    create_commit_elem('date', date, container)

    const commit_list = document.querySelector('#commit_list')
    commit_list.append(container)
  })
}

const create_commit_elem = (class_name, text, container) => {
  const elem = document.createElement('div')
  elem.className = class_name
  elem.textContent = text
  container.append(elem)
}

const fetch_data = async (url) => {
  const res = await fetch(url, init)
  if (res.status !== 200) {
    document.querySelector('#loader-container').style.display = 'none'
    const no_data = document.createElement('div')
    no_data.textContent = 'No data found! Try again a bit later.'
    body.append(no_data)
    return
  }
  const data = await res.json()
  return data
}

const get_repo_tree_sha = async () => {
  const repo = await fetch_data(`${url_prefix}/branches/master`)
  const { sha } = repo.commit.commit.tree
  return sha
}

const get_tree_folders = async (sha) => {
  const repo_folders = await fetch_data(`${url_prefix}/git/trees/${sha}`)
  const tree_folders = repo_folders.tree.filter(({ type }) => type === 'tree')
  return tree_folders
}

const fetch_tree_folders = async () => {
  const sha = await get_repo_tree_sha()
  const tree_folders = await get_tree_folders(sha)
  const { length } = tree_folders
  return length + 2
}

const fetch_exercises_review = async () => {
  const pull_requests = await fetch_data(`${url_prefix}/pulls`)
  const files_lengthes = await Promise.all(
    pull_requests.map(async (p) => {
      const branch_name = p.head.ref
      const { files } = await fetch_data(
        `${url_prefix}/compare/master...${branch_name}`,
      )
      return files.length / 3
    }),
  )

  return files_lengthes.reduce((acc, val) => (acc += val), 0)
}

const fetch_and_cache = async () => {
  const now = Date.now()

  if (localStorage.expiry && localStorage.expiry > now) {
    const data = JSON.parse(localStorage['data'])
    return data
  }

  const done_amount = await fetch_tree_folders()
  const review_amount = await fetch_exercises_review()
  const commits = await get_commits()

  const commits_per_date = await Promise.all(
    commits.map(async (commit) => {
      const { length } = await get_tree_folders(commit.sha)
      const commit_with_exercises = {
        date: commit.date,
        exercises: length + 2,
      }
      return commit_with_exercises
    }),
  )

  const exercises_per_date = Object.entries(groupBy(commits_per_date, 'date'))
    .map(([date, numbers]) => ({
      date,
      exercises: Math.max(...numbers),
    }))
    .reverse()

  localStorage['data'] = JSON.stringify({
    done_amount,
    review_amount,
    commits,
    exercises_per_date,
  })
  localStorage['expiry'] = now + hour

  return {
    done_amount,
    review_amount,
    commits,
    exercises_per_date,
  }
}

const fetch_and_display = async () => {
  const data = await fetch_and_cache()
  const { done_amount, review_amount, commits, exercises_per_date } = data
  document.querySelector('#loader-container').style.display = 'none'
  document.querySelector('#content').style.display = 'block'
  document.querySelector('#content').className = 'animate'
  display_stats(done_amount, review_amount, exercises_per_date)
  display_commits(commits)
}

populate_html()
fetch_and_display()
