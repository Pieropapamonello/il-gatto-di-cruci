(() => {
  'use strict';

  const PROJECT = 'waeiuyzteusfsajmzblj';
  const API_KEY = 'sb_publishable_0zscL8lzkUbSgDHxs0lfIw_Pu6XVMJV';
  const ADMIN_EMAIL = 'mekamiepixie@gmail.com';
  const SESSION_KEY = `sb-${PROJECT}-auth-token`;
  const STORAGE_BUCKET = 'product-images';
  const app = document.querySelector('#app');
  const nav = document.querySelector('#nav');
  const content = document.querySelector('#content');
  let session;
  let productsCache = [];

  try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
  if (!session?.access_token || session?.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    location.replace('/admin/');
    return;
  }

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const money = value => Number(value || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const date = value => value ? new Date(value).toLocaleDateString('it-IT') : '-';
  const stock = product => Array.isArray(product.variants) && product.variants.length
    ? product.variants.reduce((total, variant) => total + Number(variant.stock || 0), 0)
    : Number(product.stock || 0);

  function duplicateProductGroups(products) {
    const groups = new Map();
    products.forEach(product => {
      const key = `${String(product.name || '').trim().toLowerCase()}::${Number(product.price || 0).toFixed(2)}`;
      groups.set(key, [...(groups.get(key) || []), product]);
    });
    return [...groups.values()].filter(group => group.length > 1);
  }

  function mergedVariants(group) {
    const values = new Map();
    group.forEach(product => (Array.isArray(product.variants) ? product.variants : []).forEach(variant => {
      const name = String(variant.name || '').trim();
      if (!name) return;
      const previous = values.get(name) || 0;
      values.set(name, previous + Math.max(0, Number(variant.stock || 0)));
    }));
    return [...values.entries()].map(([name, quantity]) => ({ name, stock: quantity, available: quantity > 0 }));
  }

  const SHOPBYLINK_VARIANTS = {
    'Bracciali Chips Piete Naturali (vari) con Elastico': ['Ossidiana', 'Lepidolite', 'Ametista', 'Giada', 'Amazonite'],
    'Ciondoli Tormalina Varie (catenina acciaio inclusa)': ['Punta', 'Cabochon'],
    'Disco Selenite 1pz(varie) 10cm': ['Albero', 'Ciclo Luna'],
    'Orecchini Singoli (vari)': ['Orecchino – Ossidiana Oro', 'Orecchino – Fluorite', 'Orecchino – Avventurina & Quarzo Rosa', 'Orecchino – Granato'],
    'Pendenti a Goccia Vari (catenina acciaio inclusa)': ['ametista', 'ametista bagno argento', 'quarzo tormalinato bagno argento', 'quarzo rosa bagno argento'],
    'Pendolo in pietra naturale (varie)': ['rubino con zoisite', 'lepidolite', 'ametista', 'angelite', 'quarzo rosa'],
    'L’Eremita – Collane Essenziali (varie-scorri le foto)': ['Labradorite Oro', 'Labradorite Argento', 'Selenite Oro', 'Selenite Argento', 'Ametista Oro', 'Ametista Argento', 'Occhio di Falco Oro', 'Occhio di Falco Argento', 'Occhio Di Tigre Oro', 'Occhio di Tigre Argento', 'Malachite Oro', 'Malachite Argento', 'Quarzo Oro', 'Quarzo Argento', 'Avventurina Oro', 'Avventurina Argento', 'Acquamarina Oro', 'Acquamarina Argento', 'Turchese Oro', 'Turchese Argento', 'Ossidiana Dorata Oro', 'Ossidiana Dorata Argento'],
  };
  // Public image URLs collected from the owner's ShopByLink catalogue.  They are
  // only used to fill products that currently have no image, never to replace a
  // photo uploaded from this administration area.
  const SHOPBYLINK_IMAGES = {"lunaselenite65cm":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjJkNzkxNWI2LTQ2ODMtNDVmNi05NmQxLWE5YmM4YWI3MjM0YSIsInB1ciI6ImJsb2JfaWQifX0=--064cb5fc59f028f1c8460804846dc8156e1dd7bb/WhatsApp%20Image%202026-08-05%20at%2014.58.22%20(3)","collanaconfluorite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImJlMDJlNDJkLTdmZmMtNDFkNS05OWM4LWEyNTdhN2Q5N2M0OSIsInB1ciI6ImJsb2JfaWQifX0=--cf0ffcdee4684e652d672e635309d90867fa4bba/WhatsApp%20Image%202026-01-10%20at%2014.10.08%20(1)","orecchiniselenite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImEzNGQ4NTA0LTRlZjMtNGMzMC04NTkwLTBmYWI1NjFmNTBkNiIsInB1ciI6ImJsb2JfaWQifX0=--b64701b9c4f666add46d38362ecfec61d420e484/WhatsApp%20Image%202026-03-28%20at%2014.08.20","orecchiniinossidiana":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjdiZmNlNWU5LTkyY2EtNGRjNi1iMDNlLWQwYTIzMjg4MjljNiIsInB1ciI6ImJsb2JfaWQifX0=--1fac750f522645adf5a2b0a3e5f5f34bcdcb0fbd/WhatsApp%20Image%202026-03-28%20at%2014.08.13%20(2)","ciondoloinsodalitepietranaturale":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImExZjA4Zjg5LTdiYjQtNDk3YS05MTE2LWZmMGMxNTdjNTcyMiIsInB1ciI6ImJsb2JfaWQifX0=--b56593ffcb54a93f481c5deacdf270700004d56b/WhatsApp%20Image%202026-01-04%20at%2014.55.19%20(2)","orecchinisuperseven":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImY3YWY3YzBjLTIxYWEtNDJkZS1hOTgwLTM4ZTdlMTE2YmMyMiIsInB1ciI6ImJsb2JfaWQifX0=--6936515fce45e1db32c330ded8deb57b6cdc4a35/WhatsApp%20Image%202026-05-03%20at%2016.10.51","ciondoloadulariapietradilunacateninainclusa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjBlNzYwNWNmLWJlZjQtNDU5NS1hNjA1LWFkZDQ2MGE4MzNhYyIsInB1ciI6ImJsb2JfaWQifX0=--89fb0cb6fb771b5b953c2fd1f2ec28d03f1e39fe/WhatsApp%20Image%202026-08-08%20at%2017.57.44","smudgerosmarinoprotezioneerichiamo":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjIxMDJkOWFlLWY4M2YtNGVlNS1hMzhhLWIwZTFjNTc4YzE5MSIsInB1ciI6ImJsb2JfaWQifX0=--416d8f734ca2b8c2fa658360d2273846b817a518/WhatsApp%20Image%202026-07-27%20at%2016.17.54","collanalunaamptormalinanera":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjVkNjQ5NmZhLTg0ZTktNDBkNC1iNWFlLTk0NTFlNGI2YTY5OSIsInB1ciI6ImJsb2JfaWQifX0=--72e602530b5040f57fd6e5f34f6bd50fe859e122/WhatsApp%20Image%202026-01-17%20at%2015.00.59","pendentiagocciavaricateninaacciaioinclusa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjJiZTFlZGE3LTVkODItNDNiMi04YzU1LTM0MDczNGNjYTM0YSIsInB1ciI6ImJsb2JfaWQifX0=--039258bfb89a282520eb48ba89bff8980128adcf/WhatsApp%20Image%202026-08-07%20at%2015.52.08%20(1)","palosanto1pz1520g":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImU4ZmVmNDY5LWJhNTgtNDViYy1hODZmLTY5Zjc2M2NlZGRhNiIsInB1ciI6ImJsb2JfaWQifX0=--06c7843ca121cf5d2d0bd3807b80dcc69892ac6b/WhatsApp%20Image%202026-08-06%20at%2012.46.38%20(1)","pendoloinpietranaturalevarie":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjQ5YWI5Nzg1LTYxMGItNDFhNS1hNGUxLTBjNmNjNzQzMWQyMCIsInB1ciI6ImJsb2JfaWQifX0=--bb62041c96e22633746cf0a3ef260a3af1c436e5/WhatsApp%20Image%202026-08-05%20at%2014.58.22","collanaconlunaeametista":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6Ijk4ZjJiNDY1LTJmY2UtNDY2ZS05OGYzLTFjODcyOWFkMDU4YiIsInB1ciI6ImJsb2JfaWQifX0=--e9d9d0d189d8c30eac51fa6b08a57526e68f080f/WhatsApp%20Image%202026-01-17%20at%2015.00.50","braccialetormalinaneraenodostrega":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImY3Zjk5MDM1LTY2YTctNGIzYS1iMjVkLThkMzMyMTRlMjNlYiIsInB1ciI6ImJsb2JfaWQifX0=--ca56a05eabaf80492dd17e113d5850fb6b21d8b0/WhatsApp%20Image%202026-01-14%20at%2016.06.18","collanaconacquamarinagrezza":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImFhNjZmNWVkLWVkYmUtNDMzYy1iMjY3LWQ1N2EyZWM1YzIxMiIsInB1ciI6ImJsb2JfaWQifX0=--584964d79b8e20c7c9c958b04d69d7b207dd3886/das","orecchinisingolivari":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjBmMmU4YjQ5LWVjYjktNGRkMy1hN2MzLTgxMDM0ZDU5NzRjMiIsInB1ciI6ImJsb2JfaWQifX0=--ad38c7412e3d14db51cc0bff3eea6fa2fc95f50d/2","anelliregolabilivari":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjkyYWRmNTBiLTlhNGEtNDgxOS04ZjYzLTY4YTYxYmU5NmJjZiIsInB1ciI6ImJsb2JfaWQifX0=--ec12f275664b879c8016dbab65ee79f2e5151fb7/WhatsApp%20Image%202026-03-14%20at%2017.08.25","braccialeadulariaeluna":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjI5NGUxOWU4LTU0N2UtNDNlOS1iYTgwLThlNjU2MjJiMjc2OSIsInB1ciI6ImJsb2JfaWQifX0=--8daec547f5a911aebba91aace38e440a57b9a9b4/WhatsApp%20Image%202026-03-14%20at%2017.08.27","braccialespectroliteeankh":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjVkMTg5ODVjLTAzYTMtNDdkNi05NTJkLTgxMTQ0ODAyOTIzYSIsInB1ciI6ImJsb2JfaWQifX0=--b7b5c796bbd7a81a396738fb6d223c49db6aef9d/WhatsApp%20Image%202026-03-14%20at%2017.14.54","ciondololabradoriteampplanchette":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjA2YWZmZWQwLTgwZmYtNGRlMy1iOTEzLWIyZWZiOGVmMzMzNyIsInB1ciI6ImJsb2JfaWQifX0=--385deac91caa4efcdeb4d19aaf48e25b9d7ec04c/WhatsApp%20Image%202026-04-20%20at%2014.14.09","cuoreselenite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6Ijc4MzJhZTE0LTE1NjItNGM2My1hOTRkLWVhZGI2MmEzMjBjZCIsInB1ciI6ImJsb2JfaWQifX0=--8a45b1bbf608866b56e0ba7d704d93233ee2d1b3/WhatsApp%20Image%202026-08-05%20at%2014.58.22%20(4)","ciondolitormalinagrezzavariecateninaacciaioinclusa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImZmMGYyYWEwLWRmNDgtNGZkYi04Yzg4LWNiNTU2NzI1M2E5YSIsInB1ciI6ImJsb2JfaWQifX0=--fb5ca59c99d38a9509129d3bd18b52cd3f58877f/WhatsApp%20Image%202026-08-08%20at%2017.57.44%20(1)","braccialenododellastregaampametistaprotezioneintuizioneguidaspirituale":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImJmYmJkNGQyLTg1ZmQtNDFhMS1iZmM0LWMxMDBkOTgzYjUyZCIsInB1ciI6ImJsb2JfaWQifX0=--efac3d4b6b22e7743a188cbaeb19c952af81eb14/WhatsApp%20Image%202026-01-04%20at%2014.54.52","orecchinilunecorniola":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjgwYjY2ODZjLTc5NDktNDg0OC04N2FlLTdjMjgwZmJhZjM3MSIsInB1ciI6ImJsb2JfaWQifX0=--266db8ba3b30291b423d93c35009dcd64942beda/WhatsApp%20Image%202026-03-28%20at%2014.08.17","collanaquarzorosa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImMwNzNlYzkyLTA5YzQtNDc1Yi1hYmMxLWUxNjMxZjI2NzFkZSIsInB1ciI6ImJsb2JfaWQifX0=--4800dadc693e024db7a137e5c78419c9ebd45609/WhatsApp%20Image%202026-01-06%20at%2017.03.51","ciondolitormalinavariecateninaacciaioinclusa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjMwNGM4NjRhLTE2NzYtNDQwZS1iMWI4LTgyMGJmZjJiZjA1NiIsInB1ciI6ImJsb2JfaWQifX0=--4df82bd16cf2a1c57edd574cae701574583ae303/WhatsApp%20Image%202026-08-08%20at%2017.57.44%20(2)","smudgeartemisia":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImQzZThmZjEzLTE3YjgtNGQxMi04MWIwLTgxZGQyZDQyYTE4NSIsInB1ciI6ImJsb2JfaWQifX0=--d4b5ec6dc86532c80a7c72564d05fda56a52829a/WhatsApp%20Image%202026-08-06%20at%2015.57.43","orecchiniconfluorite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjQ4NzI5M2FhLWUzNTYtNDUxNy04MGFjLTQzNWQ5YzAzYmJmNiIsInB1ciI6ImJsb2JfaWQifX0=--6066751771c30ef3eef51bf686d33caf60787c20/WhatsApp%20Image%202026-03-14%20at%2017.08.26%20(1)","collanaconselenite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImIyODg2ZTk2LWNhYWEtNDExMi1hOWRjLTY3NmJiMThlNjZiZSIsInB1ciI6ImJsb2JfaWQifX0=--8622f556343c87e3415a2a955c974bb787125e96/WhatsApp%20Image%202026-01-04%20at%2014.54.58%20(1)","braccialichipspietenaturalivariconelastico":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImU0YmM0YzE1LTBiNmItNDI2My04YWM4LTliODMyZTI2MjU1MSIsInB1ciI6ImJsb2JfaWQifX0=--e98bb7fa8a8bf7ba3eb0db47378bf56c1362f9ce/ChatGPT%20Image%2019%20ago%202026,%2017_42_56","collanaconquarzotormalinatoequilibrioprotezioneetrasformazione":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjRhMDA5ZWE2LWMzNGEtNDExMy1hZDhiLTAwYzQzM2ZiNThjYSIsInB1ciI6ImJsb2JfaWQifX0=--c297076aa70339bfee5ee854fd2ca0ec925d0fab/1771600166%20(1)","collanalunalabradorite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjBmYjczNDZiLTRkYzAtNGE2Zi1iZjAwLWE1MTQxMzdhNjgxOSIsInB1ciI6ImJsb2JfaWQifX0=--2b76e9b0de8fab30032336b248fefee633d93c21/WhatsApp%20Image%202025-12-07%20at%2014.20.41%20(1)","collanalunaselenite":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjExMzhjMGU3LTczOWUtNDJhNi04NjJkLTc0MGJlZjYyMzVhZSIsInB1ciI6ImJsb2JfaWQifX0=--bd402a3c5d7aa1a16ca38fe95632d0d10e63970e/1762526247","leremitacollaneessenzialivariescorrilefoto":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZjYzAyMjJlLTY4MTctNGI2MC05YjM2LTJlYjZmOGE1ZTA1YyIsInB1ciI6ImJsb2JfaWQifX0=--ff03c38025bf6bafe60a50fc5066aeab649a950f/WhatsApp%20Image%202026-01-28%20at%2015.41.45","tormalinagrezzaxxl111g199g":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImI4M2YyYTg5LWRhM2UtNGJkZC1hM2YzLWJkNGUzMmRlNjI3NiIsInB1ciI6ImJsb2JfaWQifX0=--6e4209441d68fa7c0261ff5470e51d66edb9f521/WhatsApp%20Image%202026-08-12%20at%2017.58.59%20(2)","ciondoloinlabradoritecateninaacciaioinclusa":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImRhYzFmNmY3LWJjMDItNDBlOS1iOTk5LWU0ZDg2ZGEzNWJlMSIsInB1ciI6ImJsb2JfaWQifX0=--3159994a841ddc4e6d6d603fa45acd20da0eedea/WhatsApp%20Image%202026-08-08%20at%2017.57.43","ametistaampnododellastrega":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6Ijg4NmFlOWI5LTczMzItNDdmOS04MDQ0LTM4NzQwZDRjZTgyOSIsInB1ciI6ImJsb2JfaWQifX0=--a9beaff46b8acc65bdf0d448518311362f3ce1ba/1771600115%20(1)","ciondoloametistascorrileimmaginiperleproprieta":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjIwMDA5ZGJlLWZlMzEtNGE1MS05NDkwLWY5YmZiNGRmYWNiZSIsInB1ciI6ImJsb2JfaWQifX0=--1f17d0b67f1dd49b5fc1328f7a6c0a1a983db263/WhatsApp%20Image%202025-12-07%20at%2014.20.41","ciondoloingiadaoro":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImUwMTE5NDQxLTAxY2YtNGI4Zi1iMmYyLTk0ZTI4Yjc2OThhNyIsInB1ciI6ImJsb2JfaWQifX0=--92ea2a575f7e724b9afea29031b02632209acc1e/WhatsApp%20Image%202026-03-21%20at%2017.43.11%20(1)","discoselenite1pzvarie10cm":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjEzYzE1NzBlLWY0YTktNGY0MS05Y2M1LWY0YjI1ZWM5M2NlOSIsInB1ciI6ImJsb2JfaWQifX0=--5e14d3c3f9116d22bd4d67586163cb78ee288998/WhatsApp%20Image%202026-08-06%20at%2016.35.16","collanaconcorniola":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImM3NWM3MGM1LTE1MWUtNDY3ZS04NDI4LTkxMzhhNGUyNDgxOSIsInB1ciI6ImJsb2JfaWQifX0=--66509e35cd17778d428ff0e99b6d60b203dd7d79/WhatsApp%20Image%202026-03-16%20at%2014.53.46%20(1)","smudgesalvia":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZlMGQ3NTZmLTFiMzItNGM0OS04MDI3LTEwYTAyZTM3OTNkOCIsInB1ciI6ImJsb2JfaWQifX0=--98f2b481d03e6a7a1e2ffe301bd2a14bd041b2cb/WhatsApp%20Image%202026-08-06%20at%2015.57.40","ciondololuneadularia":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImY3YjMyNmFjLTY2ZTctNGMzYy04NDk1LTAxYmI5OWM2NjNkZSIsInB1ciI6ImJsb2JfaWQifX0=--403705044e383ff481b65d7f266c458a2d07d5b7/WhatsApp%20Image%202026-03-28%20at%2014.08.23%20(1)","braccialeintormalinaneraprotezioneampradicamento":"https://app.shopbylink.com/rails/active_storage/blobs/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjRmOGNjZTU3LTc2NzEtNGQ0OS1iNTY0LWI0NjYzNTU1NTcwOCIsInB1ciI6ImJsb2JfaWQifX0=--6e509123508a76c6ce83ff27ddc253e4d8a9c05d/WhatsApp%20Image%202026-03-01%20at%2012.20.49"};
  // Immagini lette dal catalogo amministratore ShopByLink il 22 agosto 2026.
  // Sovrascrivono solo chiavi equivalenti e servono unicamente per riempire foto mancanti.
  Object.assign(SHOPBYLINK_IMAGES, {"collanaconossidiananera":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImYyZTE3MzMyLWJiMmQtNDc5Zi1hYjQwLTM5OTU5NzY4ZGUyZSIsInB1ciI6ImJsb2JfaWQifX0=--55f36b9e2df949a19b9991ff2f5f807950ca9da2/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-05-07%20at%2014.12.25%20(1)","spellinjarprotezionepurificazione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImNhMmRiZDI4LTAzZWEtNGVkNi1hY2U4LTlhZmMxNDc0ZmZkMSIsInB1ciI6ImJsb2JfaWQifX0=--38a9cc373d7cfbde3f306cfb23b6bdcb1040908c/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-05%20at%2011.54.43%20(1)","ciondololabradorite10mm":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjliMGQwZThkLTlkZjQtNGE4MC1hNDNkLTRmZWI1YjVmYTcxZCIsInB1ciI6ImJsb2JfaWQifX0=--1c797eead038ba16c3f721746018daa7bf7a41ec/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1","ciondololunaametista":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImEzNTUxNjZhLTdmYTItNDQ0Zi04NDQ2LWY5NGU0M2ZhMmRjNCIsInB1ciI6ImJsb2JfaWQifX0=--19ff5ca3ce7fc662d2aca34e741f98164f8aa7ee/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-04%20at%2014.55.15","ciondoloametista10mmoro":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjNlNzVjNGJkLWQ1OTQtNDE2MS04NzQyLTViMGIwMzYzZjNjNyIsInB1ciI6ImJsb2JfaWQifX0=--d7c9808deb3717c72d37d2f205b99aa69a55b590/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-04%20at%2014.55.03","collanaoroconadularia10mm":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZiNjEwNTQ5LTU0MmYtNDE2NC1hMzM1LWYyNTYwMDMxYmVhZCIsInB1ciI6ImJsb2JfaWQifX0=--4f100d586258d9e2150357d2ac3b95bdf4160efd/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-04%20at%2014.55.17%20(1)","collanalunaoroadularia":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjIwNzcyNWZhLTk1OGMtNDdjMy04NjM4LTUxMWM1MGIxMzUxMyIsInB1ciI6ImJsb2JfaWQifX0=--bbe931945e6970ff7651c0c7ee815c665d18ab60/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-04%20at%2014.55.05","collanaadularia10mm":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjRjM2E4NTVkLTA5ZGMtNDNkYS04MTBmLTc1NjUzOGRhMmE1ZCIsInB1ciI6ImJsb2JfaWQifX0=--5860ec394a2424f112ff3f04a9496f3deb767b8d/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/3","collanaconavventurina":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImM0NDRjNWY1LTUwOWUtNGNjNC1hYmE3LTM3MWZkYWY0Y2ZlYyIsInB1ciI6ImJsb2JfaWQifX0=--c06ae2088e1a065b7b6a67c7e7d1d87b3573236a/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/avventurina","collanaconocchiodifalco":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjA4OGUzNTBkLWI1ZmItNDQzZC04OWI4LTJjZTU4MjliNzIyMyIsInB1ciI6ImJsb2JfaWQifX0=--cac201a712d26c93f8fa5492d81500e527b399bb/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1764255347","collanaconmalachite":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjUyZGY4N2JiLWRmZWQtNGYxNi1hMzZkLTdkY2IwNWYwMjYwOCIsInB1ciI6ImJsb2JfaWQifX0=--ebb36b7b3a352bcfe2422a7f3a1bc7be123ce8be/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1764774068","collanaconlarimar":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjE3M2ZkMjlkLTM5ZTctNGRmYS1iNmE2LTA5NzQ2ZGI2N2ZhYiIsInB1ciI6ImJsb2JfaWQifX0=--81ac4c72a1985171087cda5ab5f117658419d163/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1763570646","collanaconquarzorosa":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjE1NDQzNzc2LTE2OWMtNDZmYS1iNmQ3LTQxZTkxNWE1N2U2ZSIsInB1ciI6ImJsb2JfaWQifX0=--a661aea51a0fb2e8920cd010c59af2e8679432d0/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1764431460","collanaossidianadorata":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImZmOTFiNGE3LTJmZTktNDY3YS04Y2FhLTk2MjIxZTQ1OWRmYyIsInB1ciI6ImJsb2JfaWQifX0=--82c5dad1065cae39c4d6553cce8fd088074f0d0d/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-06%20at%2017.03.50%20(1)","setdiprotezionetormalina":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjA2MWVmNTc2LTRmYjQtNGZkNS1hMTk5LTMzNzJhODUzNzgyNCIsInB1ciI6ImJsb2JfaWQifX0=--461a347609d8e4fa618ea33ac32be0f8acaca8c2/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-07%20at%2015.03.52%20(2)","spellinjarrinnovamentocrescita":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjAyNjg2ODAxLTRlNTMtNDgxMy1iMjhjLWZkNDYyOTA2Y2E5MSIsInB1ciI6ImJsb2JfaWQifX0=--b3d1c284f3bbcf68cdb8cb9001d07284c3a67f14/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-07%20at%2016.21.07%20(1)","setpurificazionecristalli":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImUwNWRhYzA5LTUwYTEtNDA1Yi1iN2IwLWMwYWIwYjZmOTRkYyIsInB1ciI6ImJsb2JfaWQifX0=--bf30b61ceede115d232edbf6b64a88425ca89786/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1765476543","anelloinacquamarinarame":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImNjYmM2NzE5LTkxZDUtNDNjNC05Y2JiLWUxNmZiMTkyMWRjMCIsInB1ciI6ImJsb2JfaWQifX0=--39a440dd849116d47eab7c5acb346130e7848242/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-11%20at%2018.23.05%20(2)","anelloinametistarame":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjVjYjZjMjAyLTYzNzUtNDQ0OC1iM2ZjLTI4YTU5MzEzNDlmYiIsInB1ciI6ImJsb2JfaWQifX0=--1a57dfa747bb3f103febc26ece2a0f80fcc3d1fa/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-11%20at%2018.23.04","anelloinadulariarame":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjQyNzAzYzc2LTUzODYtNDRkNS1iNDM1LWRhNjhjYWU5YjllNSIsInB1ciI6ImJsb2JfaWQifX0=--b325ca01251d0494a895e356729169853c7b8885/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-11%20at%2018.23.03","anelloinseleniterame":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjllZmQ0YTc0LTQ1MjUtNDgxNS1iMGY5LTYwY2ExMTVhZWE5MSIsInB1ciI6ImJsb2JfaWQifX0=--8c0b44b0df6832ce16226c5d367fed22aad395a7/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-11%20at%2018.23.06","orecchiniconselenite":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZiOWVhODk3LTNjOGQtNGVhMC05MDQ4LTRiNmE1Mjg4ZDZjOSIsInB1ciI6ImJsb2JfaWQifX0=--c9323805703f846c4c3268d70518f53f21775e37/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-13%20at%2017.52.04","collanaconossidianadorata":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjIxZTcxNmU4LTJhYmQtNGQyNC1iZTkwLTRkNDYwYWQ3MDU5NyIsInB1ciI6ImJsb2JfaWQifX0=--e2a8c8e96e519a2dc2761df2e638aba993fb2ceb/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-14%20at%2016.06.17%20(3)","ciondololunaintrecciataamanoadulariaselenite":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6Ijc4Mjk0OTAwLTJjZjctNDc1Yy05NmE2LTJmZjZkMTNkYzI5NyIsInB1ciI6ImJsb2JfaWQifX0=--1bd4a8601e3d788073d10a37b982f9436d7e1a5b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-17%20at%2015.01.01","spellinjarfuococoraggio":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjA4MTBmYjJhLWViYjItNDdhNC04OWM4LTY5MTU3MmYyNTQ4NyIsInB1ciI6ImJsb2JfaWQifX0=--100a327660bb2013d886569971672b13104bbb7f/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1767108601%20(1)","spellinjarabbondanzaprosperita":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImMwYzdmNTRhLTNhOTMtNDNmMi1hM2Q2LWMxOWMwYWIzYTJiMyIsInB1ciI6ImJsb2JfaWQifX0=--e34ea8b1c21b871e12a2aec9139abf47e7c6dd6d/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-05%20at%2011.45.30%20(1)","collanaquarzoialinocristallodirocca":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjYwNzM1MGFlLWVhYjktNDIwZi1iMTQ3LWZkMzc3NGQzODUwNiIsInB1ciI6ImJsb2JfaWQifX0=--d597f2676a224488468af0ff713de455bd9ef7af/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-01-21%20at%2015.18.00","setcristalliprotezionepurificazione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjdmODkzZWM2LWFlYTctNDgzMi05NmY3LTk0NTczNWYzZjVmZiIsInB1ciI6ImJsb2JfaWQifX0=--e9f5cc4773c610305ac47807a02b419ff01fc7a7/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1769180480","quarzoialinocristallodiroccaburattatoxl":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjBjNWMzYjk4LTgxZDQtNGRkOS05OWNlLTAwZTVhZDNjZTkwNSIsInB1ciI6ImJsb2JfaWQifX0=--bee90cbcb3e98be7c3cdaf3fec2c0eafd5143df3/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1769265364","corniolaburattataxlvitalitamotivazioneecoraggio":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjU4NzBlMjliLTQ1NzctNGRmNC05ZjExLWUwYzdjYzkzOWY0MyIsInB1ciI6ImJsb2JfaWQifX0=--89274548a555d883ee3153daa80b2932e521af76/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1769265338","quarzorosaburattatoxl":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjEwZDJmNzhlLTM3ZGUtNDdjMC1iMWE1LTdlNGQ1NGIxN2YxMCIsInB1ciI6ImJsb2JfaWQifX0=--e8277267fcdf827e827567d652f97cb68dc3d534/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1769265387","setcandelaarmonialuce":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjBhM2JjY2ZiLTM2OWItNGMwYi04NTU1LWJjODE1Y2NiYWU4MSIsInB1ciI6ImJsb2JfaWQifX0=--5aa519dcb05273ffbf47645190e66348a0c5599b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-01%20at%2012.20.45%20(3)","setcandelaprotezionepurificazioneprofonda":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjVlNjVlYTdkLTViZjktNGRlOS05MzRiLTgxNzNmNjRlMzVlMSIsInB1ciI6ImJsb2JfaWQifX0=--4a1bb904a1b86409212c84e36da6267262e122f9/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-01%20at%2012.20.43%20(1)","collanalunaadularia":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjI2MzNjY2NlLTNjZTMtNDM2Ny1hODE2LTg0Nzg0ZTQzZDhlNCIsInB1ciI6ImJsb2JfaWQifX0=--205887dfc0a4887c3ccb4bc5c9d51e9af97e773e/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-01%20at%2012.20.48%20(2)","spellinjarforzanuoviinizi":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjJmMzRhODM2LWQzYTEtNDQxYy04ZWQyLTVmZWM0NDkzZjZiOCIsInB1ciI6ImJsb2JfaWQifX0=--faea1d59ff4b8549404aab49f7931fefbe7752ea/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-05%20at%2011.45.29","spellinjarcalmaarmonia":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjYyZTZlNjdlLTFhYWQtNGQ3YS1iYmRhLTcwYjc3MjQxMmI2YyIsInB1ciI6ImJsb2JfaWQifX0=--eacc448d3fe2756ef09090128e6c94ed1cb06f65/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-05%20at%2011.54.43","orecchiniankhprotezioneintuizione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZjNWUxZGEyLWY1ZTItNDcxMy05NjIyLWQxMWQ5MDk0ZGI3YiIsInB1ciI6ImJsb2JfaWQifX0=--54f6d33bb48bd841c7a1c566db9396c09948db41/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-17%20at%2018.45.21","runeartigianalisolosuordinazione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImI4N2UxOTUzLTJiZjAtNDBiYS05MjA2LWU5ODA1MTU0NGZiYyIsInB1ciI6ImJsb2JfaWQifX0=--546c6c23948373d20f57ebd1319fd3db98619b5e/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-03-20%20at%2014.02.39","braccialeregolabileametista":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjA1MmIyMWE1LTU0OTAtNDBiZC1hZjZlLWVjOGEwZjdkNzczYyIsInB1ciI6ImJsb2JfaWQifX0=--a296121752ef27caaa3f7aaa9411f779af017f3d/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1773941414%20(1)","spellinjararmoniaallineamento":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImUxZDZiNjdmLTQ3NWEtNDlkZC05ZDExLWFjMDFjMWNiOGU2YSIsInB1ciI6ImJsb2JfaWQifX0=--55a562208019c4c29129cb03bb6403bb743ed962/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-04-08%20at%2015.42.30","spellinjarforzaprotezione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjQyYjU0OTk2LWNjZTQtNGZmNS05OWZjLWEyM2NmMDdhYTc1MSIsInB1ciI6ImJsb2JfaWQifX0=--0104c0fd3f4a42814a851fca163e87111b0d8993/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-04-08%20at%2015.42.31%20(2)","setconsmudgedirosmarino":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjMwZDEzYWQ2LTBhMjAtNDg4Ny1iYmYzLThmYTQ5YjcxMTIwMiIsInB1ciI6ImJsb2JfaWQifX0=--51ddb6c49b88525e12a0c8bfec869d0f34cdded2/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-04-10%20at%2012.55.15%20(1)","statuettagattooro":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjAwZGJlZmQwLWI5YzMtNGQxYS04NTUyLWE4YWZmYWIwODhlYiIsInB1ciI6ImJsb2JfaWQifX0=--06ebb4ea7d51b932b2568c1dcf0245fc7d667eb5/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-04-10%20at%2013.16.02%20(1)","lucenoecandeladiconnessione":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImZlNzY1OTA0LTEzZTUtNGZkOS05ZjQ1LWRhNDNhMjgyM2RmNiIsInB1ciI6ImJsb2JfaWQifX0=--aecb1e88aa0320f0e64f829533369eb30032f4d3/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/1%20(2)","braccialeconametista":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6IjZjNDE5MWViLWMwMjAtNDA5ZC05ZGFjLWJiNTEyZjZkNWU2MSIsInB1ciI6ImJsb2JfaWQifX0=--f0877133a17b900ed9ec0c6a28914e6199d93f36/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-05-17%20at%2015.21.10%20(2)","avventurina":"https://app.shopbylink.com/rails/active_storage/representations/proxy/eyJfcmFpbHMiOnsiZGF0YSI6ImZlNjVkYTFhLWQ5YjctNDVlMy1hZTJlLWQ2NzVjMGUyMWY1NSIsInB1ciI6ImJsb2JfaWQifX0=--3c13953b2a4a81fdf76e16472df51229f9942183/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJqcGciLCJyZXNpemVfdG9fZmlsbCI6WzQwMCw0MDBdfSwicHVyIjoidmFyaWF0aW9uIn19--c4e88e896450391d5d10905f6b8c30efd333c78c/WhatsApp%20Image%202026-07-27%20at%2016.17.57%20(1)"});
  const comparableName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it-IT').replace(/[^\p{L}\p{N}]+/gu, '');

  async function seedShopByLinkVariants() {
    const seeds = Object.entries(SHOPBYLINK_VARIANTS);
    if (!confirm(`Saranno configurate ${seeds.length} famiglie di varianti da ShopByLink. Ogni variante inizierà con quantità 1. Le varianti già configurate non verranno modificate. Continuare?`)) return;
    try {
      const products = await api('products?select=*&order=created_at.desc');
      let updated = 0;
      for (const [name, choices] of seeds) {
        const target = products.find(product => comparableName(product.name) === comparableName(name));
        if (!target || (Array.isArray(target.variants) && target.variants.length)) continue;
        const variants = choices.map(choice => ({ name: choice, stock: 1, available: true }));
        await api(`products?id=eq.${encodeURIComponent(target.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ variants, stock: variants.length, available: true }) });
        updated++;
      }
      alert(updated ? `Varianti configurate per ${updated} prodotti. Ora puoi modificare le quantità una per una.` : 'Nessun prodotto da aggiornare: le varianti sono già configurate o il prodotto non è presente nel database.');
      productsPage();
    } catch (error) { alert(`Non è stato possibile configurare le varianti: ${error.message}`); }
  }

  async function restoreShopByLinkImages() {
    if (!confirm('Saranno aggiunte le foto di ShopByLink solo ai prodotti che ne sono privi. Le foto già caricate non verranno modificate. Continuare?')) return;
    try {
      const products = await api('products?select=id,name,image_url');
      let updated = 0;
      for (const product of products) {
        if (String(product.image_url || '').trim()) continue;
        const imageUrl = SHOPBYLINK_IMAGES[comparableName(product.name)];
        if (!imageUrl) continue;
        await api(`products?id=eq.${encodeURIComponent(product.id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ image_url: imageUrl }),
        });
        updated++;
      }
      alert(updated ? `Foto ripristinate per ${updated} prodotti. Le altre non avevano una foto corrispondente nel catalogo ShopByLink.` : 'Nessuna foto da ripristinare: le immagini sono già presenti oppure non esiste una corrispondenza nel catalogo ShopByLink.');
      productsPage();
    } catch (error) { alert(`Non è stato possibile ripristinare le foto: ${error.message}`); }
  }

  async function removeDuplicateProducts(groups) {
    const names = groups.map(group => `${group[0].name} (${group.length} copie)`).join('\n');
    if (!confirm(`Saranno uniti questi prodotti duplicati:\n\n${names}\n\nVerrà mantenuta una sola scheda per prodotto e le quantità saranno sommate. Continuare?`)) return;
    try {
      for (const group of groups) {
        const ordered = [...group].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const keeper = ordered.find(product => product.legacy_id !== null && product.legacy_id !== undefined) || ordered[0];
        const copies = ordered.filter(product => product.id !== keeper.id);
        const variants = mergedVariants(group);
        const totalStock = variants.length ? variants.reduce((sum, variant) => sum + variant.stock, 0) : group.reduce((sum, product) => sum + Math.max(0, Number(product.stock || 0)), 0);
        await api(`products?id=eq.${encodeURIComponent(keeper.id)}`, {
          method: 'PATCH', headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ stock: totalStock, variants, available: group.some(product => product.available !== false) && totalStock > 0 }),
        });
        for (const copy of copies) await api(`products?id=eq.${encodeURIComponent(copy.id)}`, { method: 'DELETE' });
      }
      alert('Duplicati rimossi. Le quantità sono state conservate nella scheda rimasta.');
      productsPage();
    } catch (error) { alert(`Non è stato possibile completare la pulizia: ${error.message}`); }
  }

  async function api(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://${PROJECT}.supabase.co/rest/v1/${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          apikey: API_KEY,
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem(SESSION_KEY);
          location.replace('/admin/');
          throw new Error('Sessione scaduta. Accedi di nuovo.');
        }
        throw new Error(body?.message || body?.hint || body?.details || 'Operazione non riuscita.');
      }
      return body;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Supabase non risponde. Riprova tra poco.');
      throw error;
    } finally { clearTimeout(timer); }
  }

  async function uploadProductImage(file) {
    if (!file) return null;
    if (!file.type.startsWith('image/')) throw new Error('Seleziona un file immagine valido.');
    if (file.size > 8 * 1024 * 1024) throw new Error('La foto deve pesare al massimo 8 MB.');
    const extension = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
    const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
    const response = await fetch(`https://${PROJECT}.supabase.co/storage/v1/object/${STORAGE_BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: API_KEY, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file.type, 'x-upsert': 'false' },
      body: file,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || 'Caricamento foto non riuscito. Esegui prima lo script di configurazione immagini in Supabase.');
    }
    return `https://${PROJECT}.supabase.co/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
  }

  const pages = [
    ['home', '⌂  Home'], ['links', '⌁  Link'], ['products', '◇  Prodotti'], ['orders', '▣  Ordini'],
    ['customers', '♧  Clienti'], ['coupons', '✿  Coupon'], ['returns', '↩  Resi'], ['payments', '▦  Incassi'], ['settings', '⚙  Impostazioni'],
  ];

  function navigation(active) {
    nav.innerHTML = pages.map(([id, label]) => `<button class="${id === active ? 'active' : ''}" data-page="${id}">${label}</button>`).join('');
    nav.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => go(button.dataset.page)));
  }

  function notice(message, isError = false) {
    return `<p class="${isError ? 'error-message' : 'muted'}">${escapeHtml(message)}</p>`;
  }

  async function homePage() {
    content.innerHTML = '<h1>Home</h1><p class="muted">Caricamento riepilogo...</p>';
    try {
      const [products, orders] = await Promise.all([
        api('products?select=id,stock,variants'),
        api('orders?select=id,total,status'),
      ]);
      const paidOrders = (orders || []).filter(order => ['Approvato', 'In lavorazione', 'Completato'].includes(orderState(order.status)));
      const total = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
      content.innerHTML = `<h1>Home</h1><p class="muted">Riepilogo del tuo negozio</p><section class="stats">
        <div class="stat">Vendite confermate<b>${money(total)}</b></div><div class="stat">Ordini approvati<b>${paidOrders.length}</b></div>
        <div class="stat">Prodotti<b>${products.length}</b></div><div class="stat">Disponibili<b>${products.filter(product => stock(product) > 0 && product.available !== false).length}</b></div>
      </section>`;
    } catch (error) { content.innerHTML = `<h1>Home</h1>${notice(error.message, true)}`; }
  }

  function productRow(product) {
    const quantity = stock(product);
    const unavailable = product.available === false || quantity <= 0;
    const variantCount = Array.isArray(product.variants) ? product.variants.length : 0;
    return `<button class="product-row" data-product-id="${escapeHtml(product.id)}">
      ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="">` : '<span class="image-placeholder">◇</span>'}
      <span><strong>${escapeHtml(product.name)}</strong><small>Quantita: ${quantity}${variantCount ? ` · ${variantCount} varianti` : ''}${unavailable ? ' · Esaurito' : ''}</small></span>
      <b>${money(product.price)}</b>
    </button>`;
  }

  async function productsPage() {
    content.innerHTML = '<div class="top"><h1>Prodotti</h1><button id="new-product">＋ Nuovo prodotto</button></div><p class="muted">Caricamento prodotti...</p>';
    try {
      productsCache = await api('products?select=*&order=created_at.desc');
      const duplicateGroups = duplicateProductGroups(productsCache);
      content.innerHTML = `<div class="top"><h1>Prodotti</h1><span class="detail-actions">${duplicateGroups.length ? `<button class="ghost" id="clean-duplicates">Rimuovi duplicati (${duplicateGroups.length})</button>` : ''}<button id="new-product">＋ Nuovo prodotto</button></span></div>
        <input id="product-search" class="search" placeholder="Cerca..." autocomplete="off">
        <p id="products-count" class="muted"></p><div id="products-list" class="list"></div>`;
      const search = content.querySelector('#product-search');
      const count = content.querySelector('#products-count');
      const list = content.querySelector('#products-list');
      const draw = term => {
        const filtered = productsCache.filter(product => product.name.toLowerCase().includes(term.toLowerCase()));
        count.textContent = `Tutti · ${filtered.length}`;
        list.innerHTML = filtered.length ? filtered.map(productRow).join('') : '<p class="empty">Nessun prodotto trovato.</p>';
        list.querySelectorAll('[data-product-id]').forEach(row => row.addEventListener('click', () => productDetail(productsCache.find(product => product.id === row.dataset.productId))));
      };
      const seedVariantsButton = document.createElement('button');
      seedVariantsButton.type = 'button'; seedVariantsButton.className = 'ghost'; seedVariantsButton.id = 'seed-variants';
      seedVariantsButton.textContent = 'Configura varianti ShopByLink';
      content.querySelector('#new-product').before(seedVariantsButton);
      seedVariantsButton.addEventListener('click', seedShopByLinkVariants);
      const restoreImagesButton = document.createElement('button');
      restoreImagesButton.type = 'button'; restoreImagesButton.className = 'ghost'; restoreImagesButton.id = 'restore-images';
      restoreImagesButton.textContent = 'Ripristina foto ShopByLink';
      seedVariantsButton.before(restoreImagesButton);
      restoreImagesButton.addEventListener('click', restoreShopByLinkImages);
      content.querySelector('#new-product').addEventListener('click', () => productEditor());
      content.querySelector('#clean-duplicates')?.addEventListener('click', () => removeDuplicateProducts(duplicateGroups));
      search.addEventListener('input', event => draw(event.target.value));
      draw('');
    } catch (error) { content.innerHTML = `<h1>Prodotti</h1>${notice(error.message, true)}`; }
  }

  function variantsTable(variants) {
    if (!Array.isArray(variants) || !variants.length) return '<p class="empty">Questo prodotto non ha varianti.</p>';
    return `<div class="list variants-table"><div class="variant-head"><span>Nome</span><span>Quantita</span></div>${variants.map(variant => `<div class="variant-line"><span>${escapeHtml(variant.name)}</span><span>${Number(variant.stock || 0)}</span></div>`).join('')}</div>`;
  }

  function productDetail(product) {
    if (!product) return productsPage();
    navigation('products');
    const quantity = stock(product);
    const likelyVariantProduct = /\bvari(?:e|anti)?\b/i.test(product.name || '') && (!Array.isArray(product.variants) || !product.variants.length);
    content.innerHTML = `<button class="back" id="back-products">← Prodotti</button>
      <div class="top product-title"><h1>${escapeHtml(product.name)}</h1><span class="detail-actions"><button class="ghost" id="edit-product">Modifica</button><button class="ghost" id="duplicate-product">Duplica</button><button id="delete-product">Elimina</button></span></div>
      <section class="product-detail">
        ${product.image_url ? `<img class="detail-image" src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}">` : ''}
        <div class="detail-info"><p><span>Descrizione</span><strong>${escapeHtml(product.description || 'Nessuna descrizione')}</strong></p><p><span>Prezzo</span><strong>${money(product.price)}</strong></p><p><span>Quantita totale</span><strong>${quantity}</strong></p><p><span>Stato</span><strong>${product.available !== false && quantity > 0 ? 'Disponibile' : 'Esaurito'}</strong></p></div>
      </section>${likelyVariantProduct ? '<p class="error-message">Questo prodotto sembra avere varianti, ma non sono ancora state salvate. Premi Modifica e inserisci una riga “nome | quantità” per ogni scelta vendibile.</p>' : ''}<h2>Varianti</h2>${variantsTable(product.variants)}`;
    document.querySelector('#back-products').addEventListener('click', productsPage);
    document.querySelector('#edit-product').addEventListener('click', () => productEditor(product));
    document.querySelector('#duplicate-product').addEventListener('click', () => productEditor({ ...product, id: null, name: `${product.name} (copia)` }));
    document.querySelector('#delete-product').addEventListener('click', () => removeProduct(product));
  }

  function parseVariants(raw) {
    const merged = new Map();
    raw.split('\n').map(line => line.trim()).filter(Boolean).forEach(line => {
      const parts = line.split('|');
      const name = parts[0].trim();
      const quantity = Math.max(0, Number(parts[1]?.trim() || 0));
      const image = String(parts.slice(2).join('|') || '').trim();
      if (!name) return;
      const key = name.toLocaleLowerCase('it-IT');
      const current = merged.get(key) || { name, stock: 0 };
      current.stock += quantity;
      if (/^https?:\/\//i.test(image)) current.image = image;
      merged.set(key, current);
    });
    return [...merged.values()].map(variant => ({ ...variant, available: variant.stock > 0 }));
  }

  function productEditor(product = null) {
    const creating = !product?.id;
    const variants = Array.isArray(product?.variants) ? product.variants.map(variant => `${variant.name} | ${variant.stock ?? 0}${variant.image ? ` | ${variant.image}` : ''}`).join('\n') : '';
    navigation('products');
    content.innerHTML = `<button class="back" id="cancel-edit">← Prodotti</button><div class="top"><h1>${creating ? 'Nuovo prodotto' : 'Modifica prodotto'}</h1></div>
      <form id="product-form" class="editor-form"><div class="form-grid">
        <label class="wide">Nome prodotto<input id="name" required value="${escapeHtml(product?.name || '')}"></label>
        <label>Prezzo in euro<input id="price" type="number" min="0" step="0.01" required value="${escapeHtml(product?.price ?? '')}"></label>
        <label>Quantita senza varianti<input id="stock" type="number" min="0" step="1" required value="${escapeHtml(product?.stock ?? 0)}"><small>Usa questo campo solo per i prodotti senza varianti.</small></label>
        <label class="wide">Descrizione<textarea id="description" rows="4">${escapeHtml(product?.description || '')}</textarea></label>
        <label class="wide">Foto principale
          <span class="image-upload-control">
            <input id="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden>
            <button type="button" class="image-picker" id="image-picker">▣<span>Aggiungi immagine</span></button>
            <img id="image-preview" class="editor-image-preview ${product?.image_url ? '' : 'is-hidden'}" src="${escapeHtml(product?.image_url || '')}" alt="Anteprima foto">
            <span id="image-file-name" class="muted">${product?.image_url ? 'Foto attuale: puoi sostituirla.' : 'PNG, JPG, WEBP o GIF · massimo 8 MB'}</span>
          </span>
        </label>
        <label class="wide">Oppure URL foto principale<input id="image-url" type="url" placeholder="https://..." value="${escapeHtml(product?.image_url || '')}"></label>
        <label class="wide">Varianti (una per riga: nome | quantita)<textarea id="variants" rows="7" placeholder="Occhio di Falco Oro | 2&#10;Quarzo Oro | 3">${escapeHtml(variants)}</textarea><small>Ogni riga e una scelta acquistabile separata. Scrivi il nome esattamente come compare nel menu del negozio, per esempio: <b>Occhio di Falco Oro | 2</b> e <b>Quarzo Oro | 3</b>. Se inserisci varianti, la disponibilita totale e calcolata soltanto dalla somma delle loro quantita; il campo “Quantita senza varianti” viene ignorato.</small></label>
        <p class="wide muted">Puoi anche aggiungere una foto alla variante: dopo quantità scrivi <b>| URL foto</b>, per esempio <b>Occhio di Falco Oro | 2 | https://...</b>.</p>
        <label class="check wide"><input id="available" type="checkbox" ${product?.available !== false ? 'checked' : ''}> Prodotto visibile e ordinabile</label>
      </div><p id="form-message" class="error-message"></p><div class="actions"><button type="button" class="ghost" id="cancel-edit-2">Annulla</button><button type="submit">${creating ? 'Crea prodotto' : 'Salva modifiche'}</button></div></form>`;
    const cancel = () => creating ? productsPage() : productDetail(product);
    document.querySelector('#cancel-edit').addEventListener('click', cancel);
    document.querySelector('#cancel-edit-2').addEventListener('click', cancel);
    const imageFile = document.querySelector('#image-file');
    const imagePreview = document.querySelector('#image-preview');
    const imageName = document.querySelector('#image-file-name');
    document.querySelector('#image-picker').addEventListener('click', () => imageFile.click());
    imageFile.addEventListener('change', () => {
      const file = imageFile.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { imageFile.value = ''; imageName.textContent = 'Seleziona un file immagine valido.'; return; }
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.classList.remove('is-hidden');
      imageName.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`;
    });
    document.querySelector('#product-form').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const submit = form.querySelector('[type="submit"]');
      const message = document.querySelector('#form-message');
      const parsedVariants = parseVariants(document.querySelector('#variants').value);
      const payload = {
        name: document.querySelector('#name').value.trim(),
        description: document.querySelector('#description').value.trim(),
        price: Number(document.querySelector('#price').value),
        stock: Math.max(0, Number(document.querySelector('#stock').value || 0)),
        image_url: document.querySelector('#image-url').value.trim() || null,
        variants: parsedVariants,
        available: document.querySelector('#available').checked,
      };
      if (!payload.name || Number.isNaN(payload.price)) { message.textContent = 'Inserisci nome e prezzo validi.'; return; }
      submit.disabled = true; message.textContent = imageFile.files?.[0] ? 'Caricamento foto...' : 'Salvataggio...';
      try {
        const uploadedImage = await uploadProductImage(imageFile.files?.[0]);
        if (uploadedImage) payload.image_url = uploadedImage;
        let saved;
        if (creating) {
          saved = await api('products', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, owner_id: session.user.id }) });
          productDetail(saved[0]);
        } else {
          saved = await api(`products?id=eq.${encodeURIComponent(product.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
          productDetail(saved[0] || { ...product, ...payload });
        }
      } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
  }

  async function removeProduct(product) {
    if (!confirm(`Eliminare definitivamente “${product.name}”?`)) return;
    try { await api(`products?id=eq.${encodeURIComponent(product.id)}`, { method: 'DELETE' }); productsPage(); }
    catch (error) { alert(`Non e stato possibile eliminare il prodotto: ${error.message}`); }
  }

  function linkCard(link, products) {
    const included = products.filter(product => link.productIds.includes(product.id));
    const cover = included.find(product => product.image_url)?.image_url;
    return `<button class="link-card" data-link-id="${link.id}">${cover ? `<img src="${escapeHtml(cover)}" alt="">` : '<span class="link-cover">Link</span>'}<strong>${escapeHtml(link.title)}</strong><small>Creato il ${date(link.created_at)}</small><span class="link-card-footer">${included.length} prodotti <b>Condividi</b></span></button>`;
  }

  async function linksPage() {
    content.innerHTML = '<div class="top"><h1>Link di vendita</h1><button id="new-link">Nuovo link</button></div><p class="muted">Caricamento link...</p>';
    try {
      const [links, products, relations] = await Promise.all([api('sale_links?select=*&order=created_at.desc'), api('products?select=*&order=created_at.desc'), api('sale_link_products?select=link_id,product_id')]);
      const prepared = links.map(link => ({ ...link, productIds: relations.filter(relation => relation.link_id === link.id).map(relation => relation.product_id) }));
      const draw = term => {
        const filtered = prepared.filter(link => link.title.toLowerCase().includes(term.toLowerCase()));
        content.innerHTML = `<div class="top"><h1>Link di vendita</h1><button id="new-link">Nuovo link</button></div><input id="link-search" class="search" placeholder="Cerca..." value="${escapeHtml(term)}"><div class="link-grid">${filtered.length ? filtered.map(link => linkCard(link, products)).join('') : '<p class="empty">Crea il tuo primo link di vendita.</p>'}</div>`;
        document.querySelector('#new-link').addEventListener('click', () => linkEditor(products));
        document.querySelector('#link-search').addEventListener('input', event => draw(event.target.value));
        content.querySelectorAll('[data-link-id]').forEach(card => card.addEventListener('click', () => linkDetail(prepared.find(link => link.id === card.dataset.linkId), products)));
      };
      draw('');
    } catch (error) { content.innerHTML = `<h1>Link di vendita</h1>${notice(`${error.message} Esegui lo script SQL aggiornato per attivare i link.`, true)}`; }
  }

  function linkEditor(products) {
    navigation('links');
    content.innerHTML = `<button class="back" id="close-link">Chiudi</button><h1>Nuovo link</h1><form id="link-form" class="editor-form"><label>Titolo<input id="link-title" required placeholder="Es. Per Rosario"></label><label>Descrizione (opzionale)<textarea id="link-description" rows="3"></textarea></label><fieldset class="pick-list"><legend>Prodotti</legend><p class="muted">Scegli i prodotti che vuoi mettere in vendita.</p>${products.map(product => `<label class="pick-item"><input type="checkbox" value="${product.id}"><span>${escapeHtml(product.name)}<small>${money(product.price)} · Quantita: ${stock(product)}</small></span></label>`).join('')}</fieldset><p id="link-message" class="error-message"></p><div class="actions"><button type="button" class="ghost" id="cancel-link">Annulla</button><button type="submit">Crea link</button></div></form>`;
    const close = () => linksPage();
    document.querySelector('#close-link').addEventListener('click', close);
    document.querySelector('#cancel-link').addEventListener('click', close);
    document.querySelector('#link-form').addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.querySelector('#link-message');
      const submit = event.currentTarget.querySelector('[type="submit"]');
      const ids = [...content.querySelectorAll('.pick-item input:checked')].map(input => input.value);
      if (!ids.length) { message.textContent = 'Seleziona almeno un prodotto.'; return; }
      submit.disabled = true; message.textContent = 'Creazione link...';
      try {
        const created = await api('sale_links', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ owner_id: session.user.id, title: document.querySelector('#link-title').value.trim(), description: document.querySelector('#link-description').value.trim() }) });
        const link = created[0];
        await api('sale_link_products', { method: 'POST', body: JSON.stringify(ids.map(product_id => ({ link_id: link.id, product_id }))) });
        linkDetail({ ...link, productIds: ids }, products);
      } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
  }

  function linkDetail(link, products) {
    if (!link) return linksPage();
    navigation('links');
    const included = products.filter(product => link.productIds.includes(product.id));
    const publicUrl = `${location.origin}/?link=${encodeURIComponent(link.slug)}`;
    content.innerHTML = `<button class="back" id="back-links">Indietro</button><div class="top product-title"><h1>${escapeHtml(link.title)}</h1><button class="ghost" id="delete-link">Elimina</button></div><p class="muted">Creato il ${date(link.created_at)}</p><section class="stats link-stats"><div class="stat">Visite<b>${Number(link.visits || 0)}</b></div><div class="stat">Ordini<b>0</b></div></section><section class="share-box"><strong>Condividi questo link per iniziare a vendere</strong><div><input readonly value="${escapeHtml(publicUrl)}"><button class="ghost" id="copy-link">Copia</button></div><button id="share-link">Condividi</button></section><h2>Prodotti in vendita · ${included.length}</h2><div class="list">${included.map(productRow).join('') || '<p class="empty">Nessun prodotto selezionato.</p>'}</div>`;
    document.querySelector('#back-links').addEventListener('click', linksPage);
    document.querySelector('#copy-link').addEventListener('click', async () => { await navigator.clipboard.writeText(publicUrl); document.querySelector('#copy-link').textContent = 'Copiato'; });
    document.querySelector('#share-link').addEventListener('click', async () => { if (navigator.share) await navigator.share({ title: link.title, url: publicUrl }); else await navigator.clipboard.writeText(publicUrl); });
    document.querySelector('#delete-link').addEventListener('click', async () => { if (!confirm(`Eliminare il link ${link.title}?`)) return; try { await api(`sale_links?id=eq.${encodeURIComponent(link.id)}`, { method: 'DELETE' }); linksPage(); } catch (error) { alert(error.message); } });
  }

  function customerDetail(customer, orders) {
    navigation('customers');
    const history = orders.filter(order => (order.customer_email || '').trim().toLowerCase() === customer.email).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = history.reduce((sum, order) => sum + Number(order.total || 0), 0);
    content.innerHTML = `<button class="back" id="back-customers">← Clienti</button><h1>${escapeHtml(customer.name || customer.email)}</h1><p class="muted">${escapeHtml(customer.email)}</p><section class="stats"><div class="stat">Ordini<b>${history.length}</b></div><div class="stat">Totale acquistato<b>${money(total)}</b></div></section><h2>Storico ordini</h2><div class="list">${history.map(order => `<div class="row"><span>✓</span><span><strong>Ordine ${escapeHtml(order.order_number || '#')}</strong><p>${date(order.created_at)} · ${escapeHtml(order.shipping_method || 'Spedizione da definire')} · <b class="status ${orderState(order.status) === 'Annullato' ? 'status-cancelled' : ''}">${orderState(order.status)}</b></p></span><b>${money(order.total)}</b></div>`).join('') || '<p class="empty">Questo cliente non ha ancora ordini.</p>'}</div>`;
    document.querySelector('#back-customers').addEventListener('click', customersPage);
  }

  async function customersPage() {
    content.innerHTML = '<h1>Clienti</h1><p class="muted">Caricamento clienti...</p>';
    try {
      const orders = await api('orders?select=*&order=created_at.desc');
      const customers = new Map();
      orders.forEach(order => {
        const email = (order.customer_email || '').trim().toLowerCase();
        if (!email) return;
        const current = customers.get(email) || { email, name: order.customer_name || '', count: 0, total: 0 };
        current.count += 1; current.total += Number(order.total || 0); if (!current.name && order.customer_name) current.name = order.customer_name;
        customers.set(email, current);
      });
      const values = [...customers.values()];
      content.innerHTML = `<div class="top"><h1>Clienti</h1></div><input id="customer-search" class="search" placeholder="Cerca cliente..."><p class="muted">Tutti · ${values.length}</p><div class="list" id="customer-list"></div>`;
      const draw = term => {
        const list = document.querySelector('#customer-list');
        const filtered = values.filter(customer => `${customer.name} ${customer.email}`.toLowerCase().includes(term.toLowerCase()));
        list.innerHTML = filtered.map(customer => `<button class="customer-row" data-customer-email="${escapeHtml(customer.email)}"><span>Cliente</span><span><strong>${escapeHtml(customer.name || customer.email)}</strong><p>${escapeHtml(customer.email)} · ${customer.count} ordini</p></span><b>${money(customer.total)}</b></button>`).join('') || '<p class="empty">Non ci sono ancora clienti con ordini.</p>';
        list.querySelectorAll('[data-customer-email]').forEach(row => row.addEventListener('click', () => customerDetail(values.find(customer => customer.email === row.dataset.customerEmail), orders)));
      };
      document.querySelector('#customer-search').addEventListener('input', event => draw(event.target.value));
      draw('');
    } catch (error) { content.innerHTML = `<h1>Clienti</h1>${notice(error.message, true)}`; }
  }

  async function couponsPage() {
    content.innerHTML = '<div class="top"><h1>Coupon</h1><button id="new-coupon">Nuovo coupon</button></div><p class="muted">Caricamento coupon...</p>';
    try {
      const coupons = await api('coupons?select=*&order=created_at.desc');
      const draw = () => {
        content.innerHTML = `<div class="top"><h1>Coupon</h1><button id="new-coupon">Nuovo coupon</button></div><div class="list">${coupons.length ? coupons.map(coupon => `<button class="coupon-row" data-coupon="${coupon.id}"><span>Coupon</span><span><strong>${escapeHtml(coupon.name)}</strong><p>Creato il ${date(coupon.created_at)} · ${coupon.active ? 'Attivo' : 'Disattivo'}</p></span><b>${escapeHtml(coupon.code)} · ${Number(coupon.percent_off)}%</b></button>`).join('') : '<p class="empty">Non ci sono ancora coupon. Crea il primo codice sconto.</p>'}</div>`;
        document.querySelector('#new-coupon').addEventListener('click', () => couponEditor());
        content.querySelectorAll('[data-coupon]').forEach(row => row.addEventListener('click', () => couponEditor(coupons.find(coupon => coupon.id === row.dataset.coupon))));
      };
      draw();
    } catch (error) { content.innerHTML = `<h1>Coupon</h1>${notice(error.message, true)}`; }
  }

  function couponEditor(coupon = null) {
    const creating = !coupon?.id;
    navigation('coupons');
    content.innerHTML = `<button class="back" id="back-coupons">Indietro</button><h1>${creating ? 'Nuovo coupon' : 'Modifica coupon'}</h1><form id="coupon-form" class="editor-form"><div class="form-grid"><label>Nome coupon<input id="coupon-name" required value="${escapeHtml(coupon?.name || '')}" placeholder="Sconto 10%"></label><label>Codice<input id="coupon-code" required value="${escapeHtml(coupon?.code || '')}" placeholder="SCONTO10"></label><label>Sconto percentuale<input id="coupon-percent" required type="number" min="0" max="100" step="0.01" value="${escapeHtml(coupon?.percent_off ?? 10)}"></label><label class="check"><input id="coupon-active" type="checkbox" ${coupon?.active !== false ? 'checked' : ''}> Coupon attivo</label></div><p id="coupon-message" class="error-message"></p><div class="actions">${creating ? '' : '<button type="button" id="delete-coupon" class="ghost">Elimina</button>'}<button type="button" id="cancel-coupon" class="ghost">Annulla</button><button type="submit">${creating ? 'Crea coupon' : 'Salva modifiche'}</button></div></form>`;
    document.querySelector('#back-coupons').addEventListener('click', couponsPage);
    document.querySelector('#cancel-coupon').addEventListener('click', couponsPage);
    document.querySelector('#coupon-form').addEventListener('submit', async event => {
      event.preventDefault();
      const message = document.querySelector('#coupon-message'); const submit = event.currentTarget.querySelector('[type="submit"]');
      const payload = { name: document.querySelector('#coupon-name').value.trim(), code: document.querySelector('#coupon-code').value.trim().toUpperCase(), percent_off: Number(document.querySelector('#coupon-percent').value), active: document.querySelector('#coupon-active').checked };
      if (!payload.name || !payload.code) { message.textContent = 'Inserisci nome e codice.'; return; }
      submit.disabled = true; message.textContent = 'Salvataggio...';
      try { if (creating) await api('coupons', { method: 'POST', body: JSON.stringify({ ...payload, owner_id: session.user.id }) }); else await api(`coupons?id=eq.${encodeURIComponent(coupon.id)}`, { method: 'PATCH', body: JSON.stringify(payload) }); couponsPage(); } catch (error) { message.textContent = error.message; submit.disabled = false; }
    });
    document.querySelector('#delete-coupon')?.addEventListener('click', async () => { if (!confirm(`Eliminare il coupon ${coupon.code}?`)) return; try { await api(`coupons?id=eq.${encodeURIComponent(coupon.id)}`, { method: 'DELETE' }); couponsPage(); } catch (error) { alert(error.message); } });
  }

  async function simpleList(page, table, title, row) {
    content.innerHTML = `<h1>${title}</h1><p class="muted">Caricamento...</p>`;
    try {
      const rows = await api(`${table}?select=*&order=created_at.desc`);
      content.innerHTML = `<h1>${title}</h1><div class="list">${rows.length ? rows.map(row).join('') : '<p class="empty">Non ci sono ancora elementi.</p>'}</div>`;
    } catch (error) { content.innerHTML = `<h1>${title}</h1>${notice(error.message, true)}`; }
  }

  function orderState(value) {
    const state = String(value || 'Da confermare').toLowerCase();
    if (state === 'approvato' || state === 'confermato') return 'Approvato';
    if (state === 'annullato') return 'Annullato';
    if (state === 'completato') return 'Completato';
    if (state === 'in lavorazione') return 'In lavorazione';
    return 'Da confermare';
  }

  async function updateOrderStatus(order, status) {
    const actions = { Approvato: 'confermare', Annullato: 'annullare', 'In lavorazione': 'mettere in lavorazione', Completato: 'segnare come completato' };
    const action = actions[status] || 'aggiornare';
    if (!confirm(`Vuoi ${action} l'ordine ${order.order_number || ''}?`)) return;
    try {
      await api('rpc/set_order_status', { method: 'POST', body: JSON.stringify({ p_order_id: order.id, p_status: status }) });
      ordersPage();
    } catch (error) { alert(`Non e stato possibile aggiornare l'ordine: ${error.message}`); }
  }

  async function ordersPage() {
    content.innerHTML = '<h1>Ordini</h1><p class="muted">Caricamento ordini...</p>';
    try {
      const orders = await api('orders?select=*&order=created_at.desc');
      content.innerHTML = `<h1>Ordini</h1><div class="list">${orders.length ? orders.map(order => {
        const state = orderState(order.status);
        const pending = state === 'Da confermare';
        return `<div class="row order-row"><span>✓</span><span><strong>Ordine ${escapeHtml(order.order_number || '#')}</strong><p>${escapeHtml(order.customer_name || order.customer_email || '')} · ${date(order.created_at)} · <b class="status ${state === 'Annullato' ? 'status-cancelled' : ''}">${state}</b></p></span><span class="order-actions"><b>${money(order.total)}</b>${pending ? `<span><button class="confirm-order" data-order-id="${escapeHtml(order.id)}">Conferma</button><button class="ghost cancel-order" data-order-id="${escapeHtml(order.id)}">Annulla</button></span>` : ''}</span></div>`;
      }).join('') : '<p class="empty">Non ci sono ancora ordini.</p>'}</div>`;
      content.querySelectorAll('.confirm-order').forEach(button => button.addEventListener('click', () => updateOrderStatus(orders.find(order => order.id === button.dataset.orderId), 'Approvato')));
      content.querySelectorAll('.cancel-order').forEach(button => button.addEventListener('click', () => updateOrderStatus(orders.find(order => order.id === button.dataset.orderId), 'Annullato')));
    } catch (error) { content.innerHTML = `<h1>Ordini</h1>${notice(error.message, true)}`; }
  }

  function orderDetail(order, back = ordersPage) {
    if (!order) return back();
    navigation('orders');
    const state = orderState(order.status);
    const pending = state === 'Da confermare';
    const items = Array.isArray(order.items) ? order.items : [];
    const articles = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    content.innerHTML = `<button class="back" id="back-orders">Indietro</button><div class="top product-title"><h1>Ordine ${escapeHtml(order.order_number || '#')}</h1><span class="detail-actions">${pending ? '<button id="confirm-detail-order">Conferma ordine</button><button class="ghost" id="cancel-detail-order">Annulla ordine</button>' : `<b class="status ${state === 'Annullato' ? 'status-cancelled' : ''}">${state}</b>`}</span></div><p class="muted">Ricevuto il ${date(order.created_at)}</p><section class="card"><h2>Riepilogo</h2><div class="list">${items.map(item => `<div class="row"><span>${item.image_url ? `<img src="${escapeHtml(item.image_url)}" alt="">` : 'Prodotto'}</span><span><strong>${escapeHtml(item.name)}</strong><p>${item.variant ? `Variante: ${escapeHtml(item.variant)} · ` : ''}${Number(item.quantity)} × ${money(item.price)}</p></span><b>${money(Number(item.price || 0) * Number(item.quantity || 0))}</b></div>`).join('') || '<p class="empty">Dettaglio articoli non disponibile.</p>'}</div><div class="order-totals"><p>Articoli <b>${money(articles)}</b></p><p>${escapeHtml(order.shipping_method || 'Spedizione')} <b>${money(order.shipping_price || Math.max(0, Number(order.total || 0) - articles))}</b></p><p><strong>Totale</strong> <strong>${money(order.total)}</strong></p></div></section><section class="card"><h2>Cliente</h2><p><strong>${escapeHtml(order.customer_name || '—')}</strong><br>${escapeHtml(order.customer_email || '—')}<br>${escapeHtml(order.customer_address || 'Indirizzo non indicato')}</p><p class="muted">${escapeHtml(order.payment_method || 'Pagamento manuale')}</p></section>`;
    document.querySelector('#back-orders').addEventListener('click', back);
    document.querySelector('#confirm-detail-order')?.addEventListener('click', () => updateOrderStatus(order, 'Approvato'));
    document.querySelector('#cancel-detail-order')?.addEventListener('click', () => updateOrderStatus(order, 'Annullato'));
    if (state !== 'Annullato' && state !== 'Completato') {
      const actions = content.querySelector('.detail-actions');
      const working = document.createElement('button');
      working.type = 'button'; working.className = 'ghost'; working.textContent = 'In lavorazione';
      const completed = document.createElement('button');
      completed.type = 'button'; completed.className = 'ghost'; completed.textContent = 'Completato';
      actions.append(working, completed);
      working.addEventListener('click', () => updateOrderStatus(order, 'In lavorazione'));
      completed.addEventListener('click', () => updateOrderStatus(order, 'Completato'));
    }
  }

  async function ordersPage() {
    content.innerHTML = '<h1>Ordini</h1><p class="muted">Caricamento ordini...</p>';
    try {
      const orders = await api('orders?select=*&order=created_at.desc');
      content.innerHTML = `<h1>Ordini</h1><div class="list">${orders.length ? orders.map(order => {
        const state = orderState(order.status); const pending = state === 'Da confermare';
        return `<div class="row order-row" data-order-open="${escapeHtml(order.id)}"><span>✓</span><span><strong>Ordine ${escapeHtml(order.order_number || '#')}</strong><p>${escapeHtml(order.customer_name || order.customer_email || '')} · ${date(order.created_at)} · <b class="status ${state === 'Annullato' ? 'status-cancelled' : ''}">${state}</b></p></span><span class="order-actions"><b>${money(order.total)}</b>${pending ? `<span><button class="confirm-order" data-order-id="${escapeHtml(order.id)}">Conferma</button><button class="ghost cancel-order" data-order-id="${escapeHtml(order.id)}">Annulla</button></span>` : ''}</span></div>`;
      }).join('') : '<p class="empty">Non ci sono ancora ordini.</p>'}</div>`;
      content.querySelectorAll('[data-order-open]').forEach(row => row.addEventListener('click', () => orderDetail(orders.find(order => order.id === row.dataset.orderOpen))));
      content.querySelectorAll('.confirm-order').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); updateOrderStatus(orders.find(order => order.id === button.dataset.orderId), 'Approvato'); }));
      content.querySelectorAll('.cancel-order').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); updateOrderStatus(orders.find(order => order.id === button.dataset.orderId), 'Annullato'); }));
    } catch (error) { content.innerHTML = `<h1>Ordini</h1>${notice(error.message, true)}`; }
  }

  async function paymentsPage() {
    content.innerHTML = '<h1>Incassi</h1><p class="muted">Caricamento incassi...</p>';
    try {
      const orders = await api('orders?select=*&order=created_at.desc');
      const pending = orders.filter(order => orderState(order.status) === 'Da confermare');
      const confirmed = orders.filter(order => ['Approvato', 'In lavorazione', 'Completato'].includes(orderState(order.status)));
      const pendingTotal = pending.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const confirmedTotal = confirmed.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const orderRows = rows => rows.map(order => `<div class="row"><span>€</span><span><strong>Ordine ${escapeHtml(order.order_number || '#')}</strong><p>${escapeHtml(order.customer_name || order.customer_email || '')} · ${date(order.created_at)} · ${escapeHtml(order.payment_method || 'Pagamento manuale')}</p></span><b>${money(order.total)}</b></div>`).join('');
      content.innerHTML = `<h1>Incassi</h1><section class="stats"><div class="stat">Da confermare<b>${money(pendingTotal)}</b><p>${pending.length} richieste d'ordine</p></div><div class="stat">Incassi approvati<b>${money(confirmedTotal)}</b><p>${confirmed.length} ordini confermati</p></div></section><h2>Richieste da confermare</h2><div class="list">${orderRows(pending) || '<p class="empty">Non ci sono richieste in attesa.</p>'}</div><h2>Incassi approvati</h2><div class="list">${orderRows(confirmed) || '<p class="empty">Non ci sono ancora incassi approvati.</p>'}</div>`;
    } catch (error) { content.innerHTML = `<h1>Incassi</h1>${notice(error.message, true)}`; }
  }

  function go(page) {
    navigation(page);
    if (page === 'home') return homePage();
    if (page === 'products') return productsPage();
    if (page === 'links') return linksPage();
    if (page === 'customers') return customersPage();
    if (page === 'coupons') return couponsPage();
    if (page === 'orders') return ordersPage();
    if (page === 'payments') return paymentsPage();
    const configs = {
      links: ['store_settings', 'Link di vendita', item => `<div class="row"><span>⌁</span><span><strong>${escapeHtml(item.store_name || 'Il Gatto di Cruci')}</strong><p>Link pubblico del negozio</p></span><b>Attivo</b></div>`],
    };
    if (configs[page]) return simpleList(page, ...configs[page]);
    const messages = {
      returns: ['Resi', 'Gestisci qui le richieste di reso e rimborso ricevute dai clienti.'],
      settings: ['Impostazioni', 'Le impostazioni del negozio sono salvate in Supabase.'],
    };
    const [title, text] = messages[page];
    content.innerHTML = `<h1>${title}</h1><section class="card"><h2>${title}</h2><p>${text}</p></section>`;
  }

  document.querySelector('#logout').addEventListener('click', () => { localStorage.removeItem(SESSION_KEY); location.replace('/admin/'); });
  app.hidden = false;
  go('home');
})();
