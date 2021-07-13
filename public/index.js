let test = false;

$(".navbar-toggler").click(function() {
  console.log(">?>?>?>?");
  if(!test) {
    test = true;
    $(".navbar").css("height","250px");
  }
  else {
    test = false;
    $(".navbar").css("height","90px");
  }
});
