window.onload = function(){
    $('#loginBtn').click(function(){
        window.location = '/login';
    })
    $('#signUpBtn').click(function(){
        window.location = '/signup';
    })

    $('#sidebarBtn').click(function(){
        console.log('click')
        $('.sidebar')
          .sidebar('toggle')
        ;
    });

    $('#sidebarBtn').hover(function(){
        $(this).css('cursor','pointer')
    })
}