import { Brain, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
const Footer = () => {
    const footerLinks = {
        Platform: [
            { name: "Wellness Dashboard", href: "/wellness" },
            { name: "Resources", href: "/resources" },
            { name: "Counselling", href: "/counselling" },
            { name: "Peer Support", href: "/peer" }
        ],
        Support: [
            { name: "Help Center", href: "#help" },
            { name: "Contact Us", href: "#contact" },
            { name: "Crisis Support", href: "#crisis" },
            { name: "FAQ", href: "#faq" }
        ],
        Legal: [
            { name: "Privacy Policy", href: "#privacy" },
            { name: "Terms of Service", href: "#terms" },
            { name: "Data Protection", href: "#data" },
            { name: "Accessibility", href: "#accessibility" }
        ]
    };
    const socialLinks = [
        { icon: Facebook, href: "#", label: "Facebook" },
        { icon: Twitter, href: "#", label: "Twitter" },
        { icon: Instagram, href: "#", label: "Instagram" },
        { icon: Linkedin, href: "#", label: "LinkedIn" }
    ];
    return (<footer className="reveal-on-scroll bg-gradient-to-t from-background via-muted/5 to-background border-t border-glass-border/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-6">
              <div className="motion-icon-pop p-2 rounded-lg bg-gradient-primary glow-primary">
                <Brain className="h-6 w-6 text-primary-foreground"/>
              </div>
              <span className="text-xl font-bold gradient-text">MindSupport</span>
            </div>
            
            <p className="text-foreground/70 mb-6 leading-relaxed">
              Empowering students with confidential mental health support, professional counseling, 
              and community connections for better academic and personal wellbeing.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center space-x-3 text-foreground/60">
                <Mail className="h-4 w-4"/>
                <span>support@mindsupport.edu</span>
              </div>
              <div className="flex items-center space-x-3 text-foreground/60">
                <Phone className="h-4 w-4"/>
                <span>24/7 Crisis Hotline: 1-800-MENTAL</span>
              </div>
              <div className="flex items-center space-x-3 text-foreground/60">
                <MapPin className="h-4 w-4"/>
                <span>Available to students worldwide</span>
              </div>
            </div>
          </div>

          {/* Links Sections */}
          {Object.entries(footerLinks).map(([category, links]) => (<div key={category} className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-foreground mb-6">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (<li key={link.name}>
                    <a href={link.href} className="text-foreground/60 hover:text-foreground transition-colors duration-200 text-sm">
                      {link.name}
                    </a>
                  </li>))}
              </ul>
            </div>))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-glass-border/30">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="text-foreground/60 text-sm">
              © 2024 MindSupport. All rights reserved. | Mental Health Support Platform for Students
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (<a key={social.label} href={social.href} aria-label={social.label} className="motion-button p-2 rounded-lg bg-glass/30 border border-glass-border/30 text-foreground/60 hover:text-foreground hover:bg-glass/50 transition-all duration-200">
                  <social.icon className="h-4 w-4"/>
                </a>))}
            </div>
          </div>

          {/* Crisis Notice */}
          <div className="mt-8 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-center text-sm text-foreground/80 mb-2">
              <strong>Important:</strong> This platform does not replace medical or psychiatric treatment.
            </p>
            <p className="text-center text-sm text-foreground/80">
              <strong>Crisis Support:</strong> If you're experiencing a mental health emergency, 
              please contact professional services immediately, call your local emergency number, or use a crisis helpline.
            </p>
          </div>
        </div>
      </div>
    </footer>);
};
export default Footer;
