import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export default function ServicePreferences2() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Advanced Preferences</h1>
        <p className="text-muted-foreground mt-2">Fine-tune your service configurations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="items-top flex space-x-2">
            <Checkbox id="terms1" />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms1"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Order Confirmation
              </label>
              <p className="text-sm text-muted-foreground">
                Receive an email when an order is placed.
              </p>
            </div>
          </div>
          <div className="items-top flex space-x-2">
            <Checkbox id="terms2" />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms2"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Appointment Reminders
              </label>
              <p className="text-sm text-muted-foreground">
                Receive SMS reminders 24h before appointment.
              </p>
            </div>
          </div>
          <div className="items-top flex space-x-2">
            <Checkbox id="terms3" />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms3"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Delivery Notifications
              </label>
              <p className="text-sm text-muted-foreground">
                Get notified when your photos are ready to download.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
       <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          className="bg-black border-white text-white hover:bg-black/80"
        >
          Reset Defaults
        </Button>
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}
