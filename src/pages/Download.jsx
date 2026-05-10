import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadCloud, Smartphone, ExternalLink } from "lucide-react";
const PLAY_URL_MAIN = "https://play.google.com/store/apps/details?id=com.mindsupport.app";
const DIRECT_APK_MAIN = "/mindsupport-app.apk"; // Place the APK under public/ as mindsupport-app.apk
const PLAY_URL_ACTIVITY = "https://play.google.com/store/apps/details?id=com.mindsupport.activity";
const DIRECT_APK_ACTIVITY = "/mindsupport-activity.apk"; // Place the APK under public/ as mindsupport-activity.apk
const Download = () => {
    return (<div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-16">
        <section className="py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
              <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <DownloadCloud className="h-6 w-6 text-primary"/>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Download the MindSupport Apps</h1>
              <p className="text-foreground/70 mt-2">
                Get our apps on your Android device. Choose a version and start improving your wellbeing.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* MindSupport App */}
              <Card className="glass-card hover:shadow-xl transition-all rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary"/>
                    MindSupport App
                  </CardTitle>
                  <CardDescription>
                    The primary MindSupport app for counsellor messaging, sessions, and resources.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Button asChild className="w-full">
                      <a href={DIRECT_APK_MAIN} download>
                        <DownloadCloud className="h-4 w-4 mr-2"/>
                        Download Now (APK)
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href={PLAY_URL_MAIN} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2"/>
                        Google Play Store
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/60 mt-3">
                    Note: If the APK download does not start, ensure the file is placed under public/ as
                    mindsupport-app.apk, or replace the link with your hosted APK URL.
                  </p>
                </CardContent>
              </Card>

              {/* MindSupport Activity App */}
              <Card className="glass-card hover:shadow-xl transition-all rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-secondary"/>
                    MindSupport Activity App
                  </CardTitle>
                  <CardDescription>
                    A companion app focused on activities, tracking, and engagement.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Button asChild className="w-full">
                      <a href={DIRECT_APK_ACTIVITY} download>
                        <DownloadCloud className="h-4 w-4 mr-2"/>
                        Download Now (APK)
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href={PLAY_URL_ACTIVITY} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2"/>
                        Google Play Store
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-foreground/60 mt-3">
                    Note: If the APK download does not start, ensure the file is placed under public/ as
                    mindsupport-activity.apk, or replace the link with your hosted APK URL.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center text-xs text-foreground/60">
              Replace the placeholder Play Store links with your real listings when available.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);
};
export default Download;
