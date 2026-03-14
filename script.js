const org = "mid2SUPAERO"

fetch(`https://api.github.com/orgs/${org}/repos`)
.then(response => response.json())
.then(data => {

const container = document.getElementById("repo-list")
if(!container) return

data
.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at))
.slice(0,6)
.forEach(repo => {

const div = document.createElement("div")

div.innerHTML = `
<h3><a href="${repo.html_url}">${repo.name}</a></h3>
<p>${repo.description || ""}</p>
`

container.appendChild(div)

})

})