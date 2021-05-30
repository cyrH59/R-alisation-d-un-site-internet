
const express = require('express')
const {openDb} = require("./db")

const session = require('express-session')
const app = express()
const bodyParser = require('body-parser');
const path = require('path');
//const SQLiteStore = require('connect-sqlite3')(session);
const port = 3000
const sess = {
  //store: new SQLiteStore,
  secret: 'secret key',
  resave: true,
  rolling: true,
  numuser: -1,
  cookie: {
    maxAge: 1000 * 3600//ms
  },
  saveUninitialized: true
}


if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
app.use(session(sess))
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.set('view engine', 'jade');



const categories = [
  {id: 'home', name: 'Accueil', link:"/"},
  {id: 'cat1', name: 'Catégorie 1', link:"/cat1"},
  {id: 'cat2', name: 'Catégorie 2', link:"/cat2"}
]


//Separation


app.post('/blog',(req, res) => {
  res.redirect(302,'/')
})


//Separation



app.get('/login',(req, res) => {
  res.render('login', {logged: req.session.logged, numuser: req.session.numuser})
})



//Separation



app.post('/login',async(req, res) => {
  const username = req.body.username
  const password = req.body.password
  const db = await openDb()
  const userdatas = await db.all(`
    SELECT * FROM userdata
  `)
  let test =0
  
  for (let step=1; step < userdatas.length+1; step++ ){
    if (
      test == 0
    ){
      const users = await db.get(`
        SELECT username FROM userdata
        WHERE id =?
      ` ,[step])
      const users_pass = await db.get(`
        SELECT password FROM userdata
        WHERE id =?
      ` ,[step])
      if(username == users.username
        ){
          test = 1
          if(
            password == users_pass.password
          ) {
            req.session.logged = true
            req.session.numuser= step
            data = {
              success: "Vous êtes log",
              logged: true,
              numuser: step
            }
          }else{
            data = {
            errors: "Le mot de passe n'est pas valide",
            logged: false
            }
          }
      }
    }
  }
  if(
    test == 0
  ) {
    data = {
      errors: "Le nom d'utilisateur est inconnu",
      logged: false
    }
  }
  res.render('login',data)
})


//Separation



app.get('/signup',(req, res) => {
  res.render('signup')
})


//Separation


app.post('/signup',async (req, res) => {
  const mail = req.body.mail
  const username = req.body.username
  const password = req.body.password
  const password_ver= req.body.password_ver
  const db = await openDb()
  const userdatas = await db.all(`
    SELECT * FROM userdata
  `)
  let test = 0
  let data = {
  }
  if (
    username.length < 4
  ){
    test = 1
    data = {
      errors: "Le nom d'utilisateur est trop court, il doit faire au moins 4 caractères",
      logged: false
    }
    res.render('signup',data)
  }else if (
    password.length < 6
  ){
    test = 1
    data = {
      errors: "Le mot de passe est trop court, il doit faire au moins 6 caractères",
      logged: false
    }
    res.render('signup',data)
  }else if (
    !mail.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)
  ){
    test = 1
    data = {
      errors: "Le format de l'adresse mail n'est pas valide",
      logged: false
    }
    res.render('signup',data)
  }else if (
    password != password_ver
  ){
    test = 1
    data = {
      errors: "Veuillez entrer deux fois le même mot de passe",
      logged: false
    }
  res.render('signup',data)
  }
  for (let step=1; step < userdatas.length+1; step++ ){
    const users = await db.all(`
      SELECT username,mail FROM userdata
      WHERE ID = ?
    `,[step])
    if(
      username == users[0].username
    ) {
      test = 1
      data = {
        errors: "Le nom d'utilisateur déja utilisé",
        logged: false
      }
      res.render('signup',data)
    }else if (
      mail == users[0].mail
    ){
      test = 1
      data = {
        errors: "Cette adresse mail est déja utilisé",
        logged: false
      }
      res.render('signup',data)
    }
  }if (
    test == 0
  ){
   
    const add_users =await db.run(`
      INSERT INTO userdata(username, password, mail)
      VALUES(?, ?, ?)
    `,[username, password, mail])
    res.redirect(302,'/login')
  }
})


//Separation


app.get('/tendance', async(req,res) =>{
  if (req.session.logged){
    const db = await openDb()

    const categories = await db.all(`
      SELECT * FROM categories
    `)

    let posts = []
    posts = await db.all(`
      SELECT posts.id, posts.name, posts.content, posts.date_parution, userdata.username, posts.lien, avis.like, avis.dislike FROM posts
      INNER JOIN avis on avis.id = posts.id
      INNER JOIN userdata ON posts.auteur=userdata.id
      WHERE avis.commentaire = 0
      ORDER BY like DESC
    `)
    
    let cur_date=[]

    if ( typeof(posts) == typeof(unevariablenondéfinie)){
      posts=[]
    }
    else {
      let date =""
      let jour = ""
      let month = ""
      let year = ""
      for (let i = 0; i < posts.length; i++){
        date_comp=new Date(posts[i].date_parution + 3600000).toString()//On met la date au bon crénaux horaire
        jour= date_comp[8] + date_comp[9]
        month= date_comp[4]+ date_comp[5]+ date_comp[6]
        year= date_comp[11] + date_comp[12]+ date_comp[13]+ date_comp[14]

        cur_date[i] = jour+" "+month+" "+year
      }
    }

    res.render("tendance",{posts: posts,categories: categories, logged: req.session.logged, numuser: req.session.numuser, date: cur_date})
  }
  else {
    res.redirect('/login')
  }
})

app.post('/tendance', async(req,res) =>{
  res.redirect('/tendance')
})



//Separation



app.get('/visite', async(req,res) =>{
  if (req.session.logged == false){
    res.redirect('/login')
  }
  else{
    numerouser = req.session.numuser
    const db = await openDb()
    const categories = await db.all(`
      SELECT * FROM categories
    `)

    let posts = []
    posts = await db.all(`
      SELECT posts.id, posts.name, posts.content, posts.date_parution, userdata.username, posts.lien, avis.like, avis.dislike FROM posts
      INNER JOIN visite ON visite.article = posts.id
      INNER JOIN postupdate ON postupdate.article = posts.id
      INNER JOIN userdata ON posts.auteur=userdata.id
      INNER JOIN avis ON avis.article=posts.id
      WHERE visite.user= ? AND postupdate.lastupdate > visite.date AND visite.date + 86400000 > ?
    `,[numerouser, Date.now()])

    let cur_date=[]

    if ( typeof(posts) == typeof(unevariablenondéfinie)){
      posts=[]
    }
    else {
      let date =""
      let jour = ""
      let month = ""
      let year = ""
      for (let i = 0; i < posts.length; i++){
        date_comp=new Date(posts[i].date_parution + 3600000).toString()//On met la date au bon crénaux horaire
        jour= date_comp[8] + date_comp[9]
        month= date_comp[4]+ date_comp[5]+ date_comp[6]
        year= date_comp[11] + date_comp[12]+ date_comp[13]+ date_comp[14]

        cur_date[i] = jour+" "+month+" "+year
      }
    }
    res.render("visite",{posts: posts,categories: categories, logged: req.session.logged, date: cur_date, numuser: req.session.numuser})
  }
})


//Separation


app.post('/visite', async(req,res) =>{
  res.redirect('/tendance')
})


//Separation



app.get('/logout',(req, res) => {
 if (req.session.logged = false){
    res.redirect(302,'/login')
 }else {
    req.session.logged = false
    res.redirect(302,'/')
 }
})

//Separation


app.get('/lecture', async (req, res) => {
  const db = await openDb()

  const categories = await db.all(`
    SELECT * FROM categories
  `)
  
  const post = await db.all(`
    SELECT * FROM posts
  `)
  
  const commentaires = await db.all(`
    SELECT * FROM commentaires
  `)
  
  
})


//Separation


app.get('/profile', async (req, res) => {
  if (!req.session.logged){
    res.redirect('/login')
  }
  else{
    const db = await openDb()
    iduser= req.session.numuser

    const categories = await db.all(`
    SELECT * FROM categories
    `)

    user = await db.get(`
        SELECT * FROM userdata
        WHERE id = ?
    `, [iduser])

    let post =[]
    post= await db.all(`
      SELECT posts.id, posts.name, posts.content, posts.date_parution, userdata.username, posts.lien, avis.like, avis.dislike FROM posts
      INNER JOIN visite ON visite.article = posts.id
      INNER JOIN userdata ON posts.auteur=userdata.id
      INNER JOIN avis ON avis.id=posts.id
      WHERE visite.user= ?
      ORDER BY visite.date DESC
    `,[iduser])

    let cur_date=[]

    if ( typeof(post) == typeof(unevariablenondéfinie)){
      post=[]
    }
    else {
      let date =""
      let jour = ""
      let month = ""
      let year = ""
      for (let i = 0; i < post.length; i++){
        date_comp=new Date(post[i].date_parution + 3600000).toString()//On met la date au bon crénaux horaire
        jour= date_comp[8] + date_comp[9]
        month= date_comp[4]+ date_comp[5]+ date_comp[6]
        year= date_comp[11] + date_comp[12]+ date_comp[13]+ date_comp[14]

        cur_date[i] = jour+" "+month+" "+year
      }
    }
    data={
      username: user.username,
      mail: user.mail,
      logged: req.session.logged,
      date: cur_date
    }
    res.render('profile', {data, categories: categories, posts: post})
  }
})



//Separation


app.post('/changemdp', async (req, res) => {
  const db = await openDb()
  iduser= req.session.numuser
  current_mdp=req.body.current_password
  mdp= req.body.password
  mdp_ver=req.body.password_ver
  password = await db.get(`
      SELECT * FROM userdata
      WHERE id = ?
  `, [iduser])
  let test = 0
  if (password.password != current_mdp){
    test =1
    data={
      username: password.username,
      mail: password.mail,
      erreur: "Mauvais mot de passe",
      logged: req.session.logged
    }
  }
  else if (mdp != mdp_ver){
    test =1
    data={
      username: password.username,
      mail: password.mail,
      erreur: "Les nouveaux mdp ne sont pas identique",
      logged: req.session.logged
    }
  }
  else if (mdp.length < 6){
    test =1
    data={
      username: password.username,
      mail: password.mail,
      erreur: "Le mot de passe doit faire au moins 6 charactère",
      logged: req.session.logged
    }
  }
  if (test == 0){
    changepassword = await db.run(`
      UPDATE userdata
      SET password = ?
      WHERE id = ?
    `, [mdp, iduser])
    data = {
      username: password.username,
      mail: password.mail,
      logged: req.session.logged
    }
  res.render('profile', data)
  }
  else{
    res.render('profile',data)
  }
})


//Separation


app.post('/commentaire/:id', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else {
    const db = await openDb()
    const id = req.params.id
    const iduser = req.session.numuser
    const name = req.body.name
    const content = req.body.content

    const numcomliste = await db.all(`
      SELECT id FROM commentaires
      WHERE article = ?
    `,[id])
  
    const numcom = numcomliste.length + 1
    const article = id


    const commdate = await db.run(`
      INSERT INTO commentaires(name, content, article, iduser, numcom)
      VALUES(?, ?, ?, ?, ?)
    
    `,[name, content, article, iduser, numcom])
    

    const exist_date_post = await db.get(`
      SELECT * FROM postupdate
      WHERE article = ?
    `,[id])

    if (typeof(exist_date_post) == typeof(unevariablenondéfinie)){
      const add_update_post = await db.run(`
        INSERT INTO postupdate(article, lastupdate)
        VALUES(?, ?)
      `,[id, Date.now()])
    }

    else {
      const update_date_post = await db.run(`
        UPDATE postupdate
        SET lastupdate = ?
        WHERE article = ?
      `,[Date.now(), id])
    }

    res.redirect('/post/'+id)
  }
})

app.get('/commentaire/:id/delete/:idcom', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()
  const id = req.params.id
  const iduser = req.session.numuser
  const numcom = req.params.idcom
 
  
  const article = id
  const commdate = await db.run(`
    DELETE FROM commentaires
    WHERE article = ? AND numcom = ? AND iduser = ?
  `,[article, numcom, iduser])
  
  res.redirect('/post/'+id)
})

app.get('/commentaire/:id/edit/:idcom', async (req, res) => {
  if (req.session.logged){
    const id = req.params.id
    const iduser = req.session.numuser
    const idcom = req.params.idcom
    const db = await openDb()
    const commentaire= await db.get(`
      SELECT iduser, name, content FROM commentaires
      WHERE article = ? AND numcom = ?
    `,[id, idcom])
    if (
      iduser == commentaire.iduser
    ){
      data={
        name: commentaire.name,
        content: commentaire.content,
        id: id,
        idcom: idcom,
      }
      res.render('commentaire-edit',data)
    }
    else {
      console.log("Vous n'êtes pas la personne qui a créé ce commentaire")
      
      res.redirect('/post/'+id)
    }
  }
  else {
    res.redirect('/login')
  }
})

app.post('/commentaire/:id/edit/:idcom', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else {
    const db = await openDb()
    const id = req.params.id
    const iduser = req.session.numuser
    const numcom = req.params.idcom
    const name= req.body.name
    const content= req.body.content

    const commdate = await db.run(`
      UPDATE commentaires
      SET content= ?, name = ?
      WHERE article = ? AND numcom = ? AND iduser = ?
    `,[content, name, id, numcom, iduser])

    const exist_date_post = await db.get(`
      SELECT * FROM postupdate
      WHERE article = ?
    `,[id])

    if (typeof(exist_date_post) == typeof(unevariablenondéfinie)){
      const add_update_post = await db.run(`
        INSERT INTO postupdate(article, date)
        VALUES(?, ?)
      `,[id, Date.now()])
    }

    else {
      const update_date_post = await db.run(`
        UPDATE postupdate
        SET lastupdate = ?
        WHERE article = ?
      `,[Date.now(), id])
    }


    res.redirect('/post/'+id)
  }
})



app.post('/post/:id/delete', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const iduser = req.session.numuser
  const id = req.params.id
  await db.run(`
    DELETE FROM posts
    WHERE id = ? AND auteur = ?
  `,[id, iduser])
  res.redirect("/")
})

app.get('/post/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()

  const categories = await db.all(`
    SELECT * FROM categories
  `)
  
  res.render("post-create",{categories: categories})
})

app.post('/post/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  const iduser = req.session.numuser
  const name = req.body.name
  const content = req.body.content
  const lien = req.body.lien
  const category = req.body.category
  const post = await db.run(`
    INSERT INTO posts(name, content, category, auteur, date_parution, lien)
    VALUES(?, ?, ?, ?, ?, ?)
  `,[name, content, category, iduser, Date.now(), lien])

  res.redirect("/post/" + post.lastID)
})

app.get('/post/:id', async (req, res) => {
  if (!req.session.logged){
    res.redirect('/login')
  }
  else{

    const db = await openDb()
    const id = req.params.id
    const numuser = req.session.numuser
    const name=req.session.userdata

    const visite = await db.get(`
      SELECT * FROM visite
      WHERE user = ? AND article = ?
    `,[numuser, id])

    if (typeof(visite) == typeof(unevariablenondéfinie)){
      const add_visite = await db.run(`
        INSERT INTO visite(user, article, date)
        VALUES(?, ?, ?)
      `,[numuser, id, Date.now()])
    }

    else {
      const update_visite = await db.run(`
        UPDATE visite
        SET date = ?
        WHERE user = ?
      `,[Date.now(), numuser])
    }
    
    const post = await db.get(`
      SELECT * FROM posts
      LEFT JOIN categories on categories.cat_id = posts.category
      WHERE id = ?
    `,[id])
    
    let aviss = await db.get(`
      SELECT like,dislike  FROM avis
      WHERE article = ? AND commentaire = 0
    `,[id])
    
    if (
      typeof(aviss)==typeof(unevariablenondéfinie)
      ){
        const newavis= await db.run(`
          INSERT INTO avis(like, dislike, article, commentaire)
          VALUES(?, ?, ?, ?)
        `,[0, 0, id, 0])
        aviss = await db.get(`
        SELECT like,dislike  FROM avis
        WHERE article = ? AND commentaire = 0
      `,[id])
    }
    const aviuser = await db.get(`
      SELECT etat  FROM liketab
      WHERE user = ? AND article = ?
    `,[numuser, id])
    
    const commentaire = await db.all(`
      SELECT name,content FROM commentaires 
      WHERE article = ?
    `,[id]) 

    let auteur = await db.get(`
      SELECT username FROM userdata
      INNER JOIN posts ON userdata.id = posts.auteur
      WHERE posts.id = ?
    `,[id])
    
    let commentaire_auteur = await db.all(`
      SELECT username FROM userdata
      INNER JOIN commentaires ON commentaires.iduser = userdata.id
      WHERE commentaires.article = ?
    `,[id])

    if (typeof(commentaire_auteur) == typeof(unevariablenondéfinie)){
      commentaire_auteur={
        username: "anonyme"
      }
    }

    if (typeof(auteur) == typeof(unevariablenondéfinie)){
      auteur={
        username: "anonyme"
      }
    }

    let currentavis = 0
    if (typeof(aviuser) == typeof(unevariablenondéfinie)){
      currentavis= 0
    }
    else {
      currentavis = aviuser.etat
    }

    const commentaire_nb = commentaire.length
    let commentaire_content =Array.from({ length: commentaire_nb }, (_, i) => i)
    let commentaire_name =Array.from({ length: commentaire_nb }, (_, i) => i)
    
    for (let k = 0; k < commentaire_nb; k++){
      commentaire_content[k]= commentaire[k].content
      commentaire_name[k]= commentaire[k].name
    }



    const array_com = Array.from({ length: commentaire_nb }, (_, i) => i+1)
    
    
    const datepost= await db.get(`
      SELECT date_parution FROM posts
      WHERE id = ?
    `,[id])
    
    const date_comp=new Date(datepost.date_parution + 3600000).toString()//On met la date au bon crénaux horaire
    const jour= date_comp[8] + date_comp[9]
    const month= date_comp[4]+ date_comp[5]+ date_comp[6]
    const year= date_comp[11] + date_comp[12]+ date_comp[13]+ date_comp[14]

    let cur_date = jour+" "+month+" "+year

    const data = {
      like:aviss.like,
      dislike:aviss.dislike,
      useropinion: currentavis,
      auteur: auteur.username,
      user: commentaire_auteur,
      date: cur_date
    }
    res.render("post",{post: post, numuser: numuser, logged: req.session.logged, data, commentaire_name, commentaire_content, commentaire_nb, array_com})
  } 
})

app.post('/like/:id', async (req, res) => {
  const db = await openDb()
  const id = req.params.id
  const numuser = req.session.numuser
  const logged = req.session.logged
  
  if (logged){
    const aviss = await db.get(`
      SELECT like,dislike  FROM avis
      WHERE id = ? AND commentaire = 0
    `,[id])
    let nblike = aviss.like +1

    const aviuserprecedent = await db.get(`
      SELECT etat FROM liketab
      WHERE article = ? AND user= ?
    `,[id, numuser])

    if (typeof(aviuserprecedent) == typeof(unevariablenondéfinie)){// Si on était jamais venue sur la page
      const création_avis = await db.get(`
        INSERT INTO liketab(user, article, etat)
        VALUES(?, ?, ?)
      `,[ numuser, id, 1])
    }
    else{
      if (aviuserprecedent.etat == 2){ // Si on like un poste qu'on avait disliké
        const avis2s = await db.get(`
          UPDATE avis
          SET dislike = ?
          WHERE id = ? AND commentaire = 0
        `,[ aviss.dislike-1 , id])
        const avisuser = await db.get(`
          UPDATE liketab
          SET etat = ?
          WHERE article = ? AND user = ?
        `,[ 1 , id, numuser])
      }
      else if(aviuserprecedent.etat== 1){
        const avisuser = await db.get(`
          UPDATE liketab
          SET etat = ?
          WHERE article = ? AND user = ?
        `,[ 0 , id, numuser])
        nblike = nblike-2
      }
      if (aviuserprecedent.etat==0){
        const avisuser = await db.get(`
          UPDATE liketab
          SET etat = ?
          WHERE article = ? AND user = ?
      `,[ 1 , id, numuser])
      }
    }
    const avis2s = await db.get(`
      UPDATE avis
      SET like = ?
      WHERE id = ? AND commentaire = 0
    `,[ nblike, id])

  } 
  
  else{
    console.log("Erreur, vous n'êtes pas connecté")
  }
  res.redirect('/post/'+id /*,{avis : aviss} */)
})

app.get('/dislike/:id', async (req, res) => {
  const db = await openDb()
  const id = req.params.id
  const numuser = req.session.numuser
  const logged = req.session.logged

    if (logged) {
    const aviss = await db.get(`
      SELECT like,dislike  FROM avis
      WHERE id = ? AND commentaire = 0
    `,[id])
    let nbdis= aviss.dislike+1
    const aviuserprecedent = await db.get(`
      SELECT *  FROM liketab
      WHERE article = ? AND user= ?
    `,[id, numuser])
    

    if (typeof(aviuserprecedent) == typeof(unevariablenondéfinie)){// Si on était jamais venue sur la page
      const création_avis = await db.get(`
        INSERT INTO liketab(user, article, etat)
        VALUES(?, ?, ?)
      `,[ numuser, id, 1])
    }
    else {
      if (aviuserprecedent.etat == 1){ // Si on like un poste qu'on avait disliké
        const avis2s = await db.get(`
          UPDATE avis
          SET like = ?
          WHERE id = ? AND commentaire = 0
        `,[ aviss.like-1 , id])
        const avisuser = await db.get(`
          UPDATE liketab
          SET etat = ?
          WHERE article = ? AND user = ?
        `,[ 2 ,id ,numuser])
      }
      if(aviuserprecedent.etat == 2){
        const avisuser = await db.get(`
        UPDATE liketab
        SET etat = ?
        WHERE article = ? AND user = ?
      `,[ 0 , id, numuser])
      nbdis =nbdis -2
      }
      if (aviuserprecedent.etat ==0){
       
        const avisuser = await db.get(`
          UPDATE liketab
          SET etat = ?
          WHERE article = ? AND user = ?
        `,[ 2 , id, numuser])
      }
    }
    const avis2s = await db.get(`
      UPDATE avis
      SET dislike = ?
      WHERE id = ? AND commentaire = 0
    `,[nbdis , id])
  }
  else {
    console.log("Erreur, vous n'êtes pas connecté")
  }
  res.redirect('/post/'+id)
})


app.get('/post/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else {
    const db = await openDb()
    const id = req.params.id
    const iduser = req.session.numuser
    const categories = await db.all(`
      SELECT * FROM categories
    `)
    const post = await db.get(`
      SELECT * FROM posts
      LEFT JOIN categories on categories.cat_id = posts.category
      WHERE id = ?
    `,[id])


    if (post.auteur == iduser){
      res.render("post-edit",{post: post, categories: categories})
    }
    else {
      res.redirect("/post/"+id)
    }
  }
})

app.post('/post/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else {
    const db = await openDb()
    const id = req.params.id
    const name = req.body.name
    const content = req.body.content
    const category = req.body.category
    const lien = req.body.lien

    const post_update=await db.run(`
      UPDATE posts
      SET name = ?, content = ?, category = ?, lien= ?
      WHERE id = ?
    `,[name, content, category, lien, id])

    const date_update = await db.run(`
      UPDATE posts
      SET date_parution = ?
      WHERE id = ?
    `,[Date.now(), id])

    const exist_date_post = await db.get(`
    SELECT * FROM postupdate
    WHERE article = ?
  `,[id])

  if (typeof(exist_date_post) == typeof(unevariablenondéfinie)){
    const add_update_post = await db.run(`
      INSERT INTO postupdate(article, date)
      VALUES(?, ?)
    `,[id, Date.now()])
  }

  else {
    const update_date_post = await db.run(`
      UPDATE postupdate
      SET lastupdate = ?
      WHERE article = ?
    `,[Date.now(), id])
  }


    res.redirect("/post/" + id)
  }
})

app.get('/categories', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  res.render("categories", {categories})
})

app.get('/category/:id', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else{
    const id = req.params.id
    const db = await openDb()
    let category = await db.get(`
      SELECT * FROM categories
      WHERE cat_id = ?
    `,[id])
    if(typeof(category)==typeof(unevariablenondéfinie)){
      category = {
        cat_id: 0,
        cat_name: "",
      }
    }
    res.render("category-edit", {category: category})
  }
})

app.post('/category/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  
  else{
    const name = req.body.name
    const id = req.params.id
    const db = await openDb()
    const category = await db.run(`
      UPDATE categories
      SET cat_name = ?
      WHERE cat_id = ?
    `,[name ,id])
    res.redirect(302,'/categories')
  }
})

app.post('/category/:id/delete', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const id = req.params.id
  const db = await openDb()
  const category = await db.get(`
    DELETE FROM categories
    WHERE cat_id = ?
  `,[id])
  res.redirect('/categories')
})


app.get('/categories/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  else{
    const db = await openDb()
    const categories = await db.all(`
      SELECT * FROM categories
    `,)
    let cat_nb=0
    if (typeof(categories) != typeof(unevariablenondéfinie)){
      cat_nb=categories.length
    }
    data={
      logged: req.session.logged
    }
    res.render('category-create',{category: categories, data})
  }
})


app.post('/categories/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
  }
  else{
    cat_name=req.body.cat_name
    const db = await openDb()
    const categories = await db.all(`
      SELECT cat_name FROM categories
    `)

    let test = 0
    if (typeof(categories) == typeof(unevariablenondéfinie)){
      test = 1
      const categories_add = await db.run(`
        INSERT INTO categories(cat_name)
        VALUES(?)
    `,[cat_name])
    res.redirect('/categories')
    }
    else{
      for (let i = 0; i < categories.length; i++){
        if (cat_name== categories[i].cat_name){
          test = 1
          data= {
            errors: "Cette catégorie existe déja",
            logged: req.session.logged
          }
          res.render('category-create', data)
        }
      }
    }
    if (test ==0){
      const categories = await db.run(`
        INSERT INTO categories(cat_name)
        VALUES(?)
      `,[cat_name])
      res.redirect('/categories')
    }
  }
})

app.get('/:cat?', async (req, res) => {
  if (req.session.logged){
    const db = await openDb()

    const categoryActive = req.params.cat ? req.params.cat : 'home'

    const categories = await db.all(`
      SELECT * FROM categories
    `)

    const categoryObjectActive = categories.find(({cat_id}) => cat_id.toString() === categoryActive)

    let posts = []
    if(categoryActive === "home"){
      posts = await db.all(`
      SELECT posts.id, posts.name, posts.content, posts.date_parution, userdata.username, categories.cat_name, posts.lien FROM posts
      INNER JOIN categories on categories.cat_id = posts.category
      INNER JOIN userdata ON userdata.id=posts.auteur
    `)
    } else {
      posts = await db.all(`
        SELECT posts.id, posts.name, posts.content, posts.date_parution, userdata.username, categories.cat_name, posts.lien FROM posts
        INNER JOIN categories on categories.cat_id = posts.category
        INNER JOIN userdata ON userdata.id=posts.auteur
        WHERE category = ?
    `, [categoryActive])
    }
    
    
    let cur_date=[]
    
    if ( typeof(posts) == typeof(unevariablenondéfinie)){
      posts=[]
    }
    else {
      let date =""
      let jour = ""
      let month = ""
      let year = ""
      for (let i = 0; i < posts.length; i++){
        date_comp=new Date(posts[i].date_parution + 3600000).toString()//On met la date au bon crénaux horaire et en string
        jour= date_comp[8] + date_comp[9]
        month= date_comp[4]+ date_comp[5]+ date_comp[6]
        year= date_comp[11] + date_comp[12]+ date_comp[13]+ date_comp[14]

        cur_date[i] = jour+" "+month+" "+year
      }
    }
    
    
    res.render("blog",{categories: categories, categoryActive: categoryObjectActive, posts: posts, logged: req.session.logged, numuser: req.session.numuser, date: cur_date})
  }
  else {
    res.redirect('/login')
  }
})



app.listen(port,  () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

